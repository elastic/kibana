import { KibanaPluginApi } from './kibana_plugin_api';
import { KibanaCoreModules } from './kibana_core_modules';
import { Router } from '../http';

/**
 * This is the full plugin API exposed from Kibana core, everything else is
 * exposed through the plugins themselves.
 *
 * This is called for each plugin when it's created, so each plugin gets its own
 * version of these values.
 *
 * We should aim to be restrictive and specific in the apis that we expose.
 *
 * @param pluginName The name of the plugin we're building these values for
 * @param core The core Kibana features
 */
export function createKibanaValuesForPlugin(
  pluginName: string,
  configPath: undefined | string | string[],
  core: KibanaCoreModules
): KibanaPluginApi {
  return {
    logger: {
      get(...contextParts) {
        return core.logger.get('plugins', pluginName, ...contextParts);
      },
    },
    elasticsearch: {
      service: core.elasticsearch.service,
      config$: core.elasticsearch.config$,
    },
    kibana: {
      config$: core.kibana.config$,
    },
    http: {
      createAndRegisterRouter(path) {
        const router = new Router(path);
        core.http.service.registerRouter(router);
        return router;
      },
    },
    config: {
      create(ConfigClass) {
        if (configPath === undefined) {
          throw new Error('config path not defined');
        }
        return core.configService.atPath(configPath, ConfigClass);
      },
      createIfExists(ConfigClass) {
        if (configPath === undefined) {
          throw new Error('config path not defined');
        }
        return core.configService.optionalAtPath(configPath, ConfigClass);
      },
    },
  };
}
