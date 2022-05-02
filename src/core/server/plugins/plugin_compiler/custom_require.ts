import * as path from 'path';
import * as timers from 'timers';
import * as vm from 'vm';

import { AllowedInternalModules, requireNativeModule } from './modules';


const transformModuleForCustomRequire = (moduleName: string): string => {
    // return path.normalize(moduleName).replace(/\.\.?\//g, '').replace(/^\//, '') + '.js';
    return path.normalize(moduleName) + '.js';
}
const transformIndexRequire = (moduleName: string) => {
    return path.join(path.normalize(moduleName), 'index.js');
}

const allowedInternalModuleRequire = (moduleName: string): moduleName is AllowedInternalModules => {
    return moduleName in AllowedInternalModules;
}

const cloneGlobal = () => Object.defineProperties(
    {...global},
    Object.getOwnPropertyDescriptors(global)
)

export const buildCustomRequire = (files: { [s: string]: string }, appId: string, currentPath: string = '.'): (mod: string) => {} => {
  return function _requirer(mod: string): any {
        if (!mod.startsWith('.')) {
            return require(mod);
        }
    

      if (allowedInternalModuleRequire(mod)) {
          return requireNativeModule(mod, appId);
      }

      if (currentPath !== '.') {
          mod = path.join(currentPath, mod);
      }

      const transformedModule = transformModuleForCustomRequire(mod);
      const dirModule = transformIndexRequire(mod);


    //   console.log('transformedModule::', transformedModule)

      const filename = files[transformedModule] ?
        transformedModule : files[dirModule]? dirModule : undefined;

      if (!filename) {
          console.log('UNABLE TO FIND FILE:::', mod, transformedModule, dirModule);
          throw new Error(`'UNABLE TO FIND FILE:::', ${mod} -> ${transformedModule}`);
      }

      let fileExport;

      if (filename) {
          fileExport = {};
          const context = vm.createContext({
              ...cloneGlobal(),
              require: buildCustomRequire(files, appId, path.dirname(filename) + '/'),
              __dirname: path.dirname(filename) + '/',
              console,
              exports: fileExport,
              process: {},
          });

          vm.runInContext(files[filename], context);
      }

      return fileExport;

  };
}

export const buildDefaultAppContext = (injectables: unknown): vm.Context => {
  const defaultContextProperties = {
      ...cloneGlobal(),
      ...timers,
      Buffer,
  };

  return vm.createContext(Object.assign({}, defaultContextProperties, injectables));
}