import { get, noop } from 'lodash';

import * as serverConfig from '../../server/config';
import { createTransform, Deprecations } from '../../deprecation';

async function getDeprecationTransformer(spec) {
  const provider = spec.getDeprecationsProvider() || noop;
  return createTransform(await provider(Deprecations) || []);
}

/**
 *  Get the settings for a pluginSpec from the raw root settings while
 *  optionally calling logDeprecation() with warnings about deprecated
 *  settings that were used
 *  @param  {PluginSpec} spec
 *  @param  {Object} rootSettings
 *  @param  {Function} [logDeprecation]
 *  @return {Promise<Object>}
 */
export async function getSettings(spec, rootSettings, logDeprecation) {
  const prefix = spec.getConfigPrefix();
  const transformer = await getDeprecationTransformer(spec);
  const rawSettings = get(serverConfig.transformDeprecations(rootSettings), prefix);
  return transformer(rawSettings, logDeprecation);
}
