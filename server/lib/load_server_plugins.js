import { typesRegistry } from '../../common/lib/types_registry';
import { functionsRegistry as serverFunctions } from '../../common/lib/functions_registry';
import { getPluginPaths } from './get_plugin_paths';

const types = {
  serverFunctions: serverFunctions,
  commonFunctions: serverFunctions,
  types: typesRegistry,
};

const loaded = new Promise(resolve => {
  const remainingTypes = Object.keys(types);

  const loadType = () => {
    const type = remainingTypes.pop();
    getPluginPaths(type).then(paths => {
      global.canvas = global.canvas || {};
      global.canvas.register = d => types[type].register(d);

      paths.forEach(path => {
        require(path);
      });

      global.canvas = undefined;
      if (remainingTypes.length) loadType();
      else resolve(true);
    });
  };

  loadType();
});

export const loadServerPlugins = () => loaded;
