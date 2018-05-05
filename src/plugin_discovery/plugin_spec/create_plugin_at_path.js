import { inspect } from 'util';
import { resolve } from 'path';

import { Observable } from 'rxjs';

import { createInvalidPluginError } from '../errors';
import { isDirectory, isFile } from './lib';
import { PluginSpec } from './plugin_spec';
import { parseKibanaJson } from './kibana_json';
import { loadPluginProvider } from './plugin_provider';
import { createPluginsInDirectory$ } from './create_plugins_in_directory';

async function createPluginAtPath(pluginPath) {
  if (!await isDirectory(pluginPath)) {
    throw createInvalidPluginError(null, pluginPath, 'must be a directory');
  }

  const kibanaJson = await parseKibanaJson(pluginPath);
  const pluginProvider = loadPluginProvider(kibanaJson, pluginPath);

  const api = {
    Plugin: class ScopedPluginSpec extends PluginSpec {
      constructor(options) {
        super(pluginPath, kibanaJson, options);
      }
    }
  };

  const result = pluginProvider(api);

  if (!(result instanceof api.Plugin)) {
    throw createInvalidPluginError(
      kibanaJson.id,
      pluginPath,
      'Expected plugin provider to return an instance of `kibana.Plugin`, received:' + inspect(result)
    );
  }

  return result;
}

export const createPluginAtPath$ = (pluginPath) => (
  Observable
    .defer(async () => {
      const hasKibanaJson = await isFile(resolve(pluginPath, 'kibana.json'));
      const hasChildPlugins = !hasKibanaJson && await isDirectory(resolve(pluginPath, 'plugins'));

      if (hasChildPlugins) {
        return createPluginsInDirectory$(resolve(pluginPath, 'plugins'));
      }

      return Observable
        .fromPromise(createPluginAtPath(pluginPath))
        .map(plugin => ({ plugin }))
        .catch(error => [{ error }]);
    })
    .mergeAll()
);
