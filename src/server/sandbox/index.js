import { ReplaySubject } from 'rxjs';
import sandbox from 'sandbox';
import uuid from 'uuid';
import { spawnGatekeeper } from './spawn_gatekeeper';
import { SyntheticProcess } from './synthetic_process';
import { GatekeeperChannel } from './gatekeeper_channel';
import { getValidProcesses } from './valid_processes';
import { safeChildProcess } from './safe_child_process';

let spawnChildProcess;

const activateSandbox = () => {
  const result = sandbox.activate();
  if (!result.success) {
    console.warn(`Unable to activate the sandbox. ${result.message}`);
    // throw new Error(`Unable to activate the sandbox. ${result.message}`);
  }
};

export async function initializeSandbox(kbnServer) {
  const validProcesses = await getValidProcesses(kbnServer.settings);
  const gatekeeperProcess = spawnGatekeeper(validProcesses);

  // Before we've spawned a child process, we can send the gatekeeper process a SIGKILL
  // and make it exit immediately; however, once we've spawned a child process we can
  // only send it a SIGTERM so it has a chance to kill it's child processes, otherwise
  // we can orphan processes
  const childProcessSignal = new ReplaySubject(1);
  childProcessSignal.next('SIGKILL');
  safeChildProcess(gatekeeperProcess, childProcessSignal);

  spawnChildProcess = async (command, args) => {
    childProcessSignal.next('SIGTERM');
    const channel = new GatekeeperChannel(gatekeeperProcess, uuid.v4());
    return await SyntheticProcess.spawn(channel, command, args);
  };

  gatekeeperProcess.on('exit', (code, signal) => {
    throw new Error(`The gatekeeper exited with code ${code} after receiving signal ${signal || ''}, terminating parent process`);
  });

  activateSandbox();
}

export function sandboxMixin(kbnServer, server) {
  if (!spawnChildProcess) {
    throw new Error('initializeSandbox must be called before the sandboxMixin');
  }

  server.decorate('server', 'sandbox', {
    spawnChildProcess,
    $createSpawnChildProcess: (Observable) => {
      // passing the Observable in here is only temporary until x-pack and kibana are merged
      // we can only have a single instance of RxJs or else we get weird behaviors and unsubscriptions
      // stop working completely
      return (cmd, args, cleanup) => {
        return Observable.create(observer => {

          let cancelled = false;
          let proc;

          const killAndCleanup = async () => {
            if (proc && !proc.killed) {
              await proc.kill();
            }

            cleanup();
            return;
          };

          (async () => {
            try {
              proc = await spawnChildProcess(cmd, args);

              if (cancelled) {
                killAndCleanup();
                return;
              }

              observer.next(proc);
            } catch (err) {
              observer.error(new Error(`Caught error spawning ${cmd}: ${err}`));
            }
          })();

          return () => {
            cancelled = true;
            killAndCleanup();
          };
        });
      };
    }
  });

}
