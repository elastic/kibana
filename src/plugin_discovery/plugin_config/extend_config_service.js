import { getSettings } from './settings';
import { getSchema, getStubSchema } from './schema';

/**
 *  Extend a config service with the schema and settings for a
 *  plugin spec and optionally call logDeprecation with warning
 *  messages about deprecated settings that are used
 *  @param  {PluginSpec} spec
 *  @param  {Server.Config} config
 *  @param  {Object} rootSettings
 *  @param  {Function} [logDeprecation]
 *  @return {Promise<undefined>}
 */
export async function extendConfigService(spec, config, rootSettings, logDeprecation) {
  const settings = await getSettings(spec, rootSettings, logDeprecation);
  const schema = await getSchema(spec);
  config.extendSchema(schema, settings, spec.getConfigPrefix());
}

/**
 *  Disable the schema and settings applied to a config service for
 *  a plugin spec
 *  @param  {PluginSpec} spec
 *  @param  {Server.Config} config
 *  @return {undefined}
 */
export function disableConfigExtension(spec, config) {
  const prefix = spec.getConfigPrefix();
  config.removeSchema(prefix);
  config.extendSchema(getStubSchema(), { enabled: false }, prefix);
}
