import { inspect } from 'util';

import { Observable } from 'rxjs';

import { createInvalidPluginError } from '../errors';
import { isDirectory } from './lib';
import { PluginSpec } from './plugin_spec';
import { parseKibanaJson } from './kibana_json';
import { loadPluginProvider } from './plugin_provider';

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
  Observable.defer(async () => createPluginAtPath(pluginPath))
    .map(plugin => ({ plugin }))
    .catch(error => [{ error }])
);
