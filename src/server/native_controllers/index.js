import path from 'path';
import { get } from 'lodash';
import { Observable } from 'rxjs';
import Joi from 'joi';
import { spawnNativeController } from './spawn_native_controller';
import { findPluginSpecs } from '../../plugin_discovery';
import { safeChildProcess } from '../../utils/child_process';
import { NativeController } from './native_controller';

const specSchema = Joi.object().keys({
  pluginId: Joi.string().required(),
  path: Joi.string().required(),
  config: Joi.array().items(Joi.string())
});

const getNativeControllers = async (settings) => {
  const {
    packageJson$,
  } = findPluginSpecs(settings);

  const spec$ = packageJson$
    .mergeMap(packageJson => {
      const nativeControllerSpecs = get(packageJson.contents, 'kibana.nativeControllers');

      if (nativeControllerSpecs) {
        return nativeControllerSpecs.map(spec => {
          const result = Joi.validate(spec, specSchema);
          if (result.error) {
            throw result.error;
          }

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
    .mergeMap(async spec => {
      const process = await spawnNativeController(settings, spec.path, spec.config);
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
        process.exit(1);
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
  const nativeControllers = Object.entries(kbnServer.nativeControllers)
    .map(([pluginId, nativeController]) => ({
      pluginId,
      nativeController
    }));

  const enabledSpecIds = kbnServer.pluginSpecs.map(spec => spec.getId());
  const disabledSpecIds = kbnServer.disabledPluginSpecs.map(spec => spec.getId());

  return await Observable
    .from(nativeControllers)
    .mergeMap(({ pluginId, nativeController }) => {
      if (enabledSpecIds.includes(pluginId)) {
        return nativeController.start();
      }

      if (disabledSpecIds.includes(pluginId)) {
        nativeController.kill();
        return Observable.empty();
      }

      throw new Error(`Found nativeController for unknown plugin ${pluginId}`);
    })
    .toPromise();
}
