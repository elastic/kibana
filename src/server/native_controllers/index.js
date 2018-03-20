import path from 'path';
import { get } from 'lodash';
import { Observable } from 'rxjs';
import { spawnNativeController } from './spawn_native_controller';
import { findPluginSpecs } from '../../plugin_discovery';
import { safeChildProcess } from '../../utils/child_process/safe_child_process';

const getNativeControllers = async (settings) => {
  const {
    pack$,
  } = findPluginSpecs(settings);

  return await pack$
    .mergeMap(pack => {
      const nativeControllers = get(pack.getPkg(), 'kibana.nativeControllers');
      if (nativeControllers) {
        return Observable.from(nativeControllers.map(nativeController => {
          return {
            pluginId: nativeController.pluginId,
            path: path.resolve(pack.getPath(), nativeController.path)
          };
        }));
      }

      return Observable.empty();
    })
    .map(nativeController => {
      return {
        process: spawnNativeController(nativeController.path),
        pluginId: nativeController.pluginId
      };
    })
    .do(nativeController => {
      const childProcess = nativeController.process;
      safeChildProcess(childProcess);

      // if the child process is killed, we kill the main process
      childProcess.on('exit', (code) => {
        console.error(`${nativeController.pluginId}'s native controller exited with code ${code}`);
        process.exit();
      });
    })
    .toArray()
    .toPromise();
};

let nativeControllersMap;

export async function spawnNativeControllers(kbnServer) {
  const nativeControllers = await getNativeControllers(kbnServer.settings);
  nativeControllersMap = nativeControllers.reduce((acc, nativeController) => {
    acc[nativeController.pluginId] = nativeController.process;
    return acc;
  }, {});
}

export async function nativeControllersMixin(kbnServer, server) {
  server.decorate('server', 'nativeControllers', nativeControllersMap);
}
