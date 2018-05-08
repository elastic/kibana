import { PluginPack } from './plugin_pack';
import { createInvalidPackError } from '../errors';

function createPack(packageJson) {
  let provider = require(packageJson.directoryPath);
  if (provider.__esModule) {
    provider = provider.default;
  }
  if (typeof provider !== 'function') {
    throw createInvalidPackError(packageJson.directoryPath, 'must export a function');
  }

  return new PluginPack({ path: packageJson.directoryPath, pkg: packageJson.contents, provider });
}

export const createPack$ = (packageJson$) => (
  packageJson$
    .mergeMap(({ error, packageJson }) => {
      if (error) {
        return [{ error }];
      }

      return [{
        pack: createPack(packageJson)
      }];
    })
    // createPack can throw errors, and we want them to be represented
    // like the errors we consume from createPackageJsonAtPath/Directory
    .catch(error => [{ error }])
);
