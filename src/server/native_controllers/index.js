import path from 'path';
import { get } from 'lodash';
import { Observable } from 'rxjs';
import { spawnNativeController } from './spawn_native_controller';
import { findPluginSpecs } from '../../plugin_discovery';
import { safeChildProcess } from '../../utils/child_process';

import { NativeController } from './native_controller';

const getNativeControllers = async (settings) => {
  const {
    packageJson$,
  } = findPluginSpecs(settings);

  const spec$ = packageJson$
    .mergeMap(packageJson => {
      const nativeControllerSpecs = get(packageJson.contents, 'kibana.nativeControllers');
      if (nativeControllerSpecs) {
        return nativeControllerSpecs.map(spec => {
          return {
            pluginId: spec.pluginId,
            path: path.resolve(packageJson.directoryPath, spec.path),
            config: spec.config
          };
        });
      }

      return Observable.empty();
    });

  const nativeController$ = spec$
    .map(spec => {
      const process = spawnNativeController(settings, spec.path, spec.config);
      return new NativeController(spec.pluginId, process);
    });

  return await nativeController$
    .do(nativeController => {
      const childProcessStatus = safeChildProcess(nativeController.process);
      nativeController.process.on('exit', (code) => {
        if (childProcessStatus.terminating || nativeController.killed) {
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
    if (acc[nativeController.pluginId]) {
      throw new Error(`Multiple native controllers defined for ${nativeController.pluginId}, which is unsupported`);
    }

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

      return nativeController.start();
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
