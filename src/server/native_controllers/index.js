import path from 'path';
import { get } from 'lodash';
import { Observable } from 'rxjs';
import { spawnNativeController } from './spawn_native_controller';
import { findPluginSpecs } from '../../plugin_discovery';
import { safeChildProcess } from '../../utils/child_process/safe_child_process';
import { NativeController } from './native_controller';

const getNativeControllers = async (settings) => {
  const {
    pack$,
  } = findPluginSpecs(settings);

  return await pack$
    .mergeMap(pack => {
      const nativeControllerSpecs = get(pack.getPkg(), 'kibana.nativeControllers');
      if (nativeControllerSpecs) {
        return Observable.from(nativeControllerSpecs.map(nativeControllerSpec => {
          return {
            pluginId: nativeControllerSpec.pluginId,
            path: path.resolve(pack.getPath(), nativeControllerSpec.path)
          };
        }));
      }

      return Observable.empty();
    })
    .map(nativeControllerSpec => {
      const process = spawnNativeController(nativeControllerSpec.path);
      return new NativeController(nativeControllerSpec.pluginId, process);
    })
    .do(nativeController => {
      safeChildProcess(nativeController.process);
      nativeController.process.on('exit', (code) => {
        if (nativeController.killed) {
          return;
        }

        console.error(`${nativeController.pluginId}'s native controller exited with code ${code}`);
        process.exit();
      });
    })
    .toArray()
    .toPromise();
};

export async function prepare(kbnServer) {
  const nativeControllers = await getNativeControllers(kbnServer.settings);
  kbnServer.nativeControllers = nativeControllers.reduce((acc, nativeController) => {
    acc[nativeController.pluginId] = nativeController;
    return acc;
  }, {});
}

export async function killOrStart(kbnServer) {
  const started$ = Observable.from(kbnServer.pluginSpecs)
    .mergeMap(spec => {
      const nativeController = kbnServer.nativeControllers[spec.getId()];
      if (!nativeController) {
        return Observable.empty();
      }

      nativeController.start();
      return nativeController.started$;
    });


  const killed$ = Observable.from(kbnServer.disabledPluginSpecs)
    .do(spec => {
      const nativeController = kbnServer.nativeControllers[spec.getId()];
      if (!nativeController) {
        return;
      }

      nativeController.kill();
    });

  // await completion of start$, kill$
  await Observable.merge(started$, killed$).toPromise();
}
