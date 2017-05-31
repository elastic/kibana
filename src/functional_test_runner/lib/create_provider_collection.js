import {
  ProviderCollection,
  readProviderSpec
} from './providers';

/**
 *  Create a ProviderCollection that includes the Service
 *  providers and PageObject providers from config, as well
 *  providers for the default services, lifecycle, log, and
 *  config
 *
 *  @param  {Lifecycle} lifecycle
 *  @param  {ToolingLog} log
 *  @param  {Config} config    [description]
 *  @return {ProviderCollection}
 */
export function createProviderCollection(lifecycle, log, config) {
  return new ProviderCollection(log, [
    ...readProviderSpec('Service', {
      // base level services that functional_test_runner exposes
      lifecycle: () => lifecycle,
      log: () => log,
      config: () => config,

      ...config.get('services'),
    }),
    ...readProviderSpec('PageObject', {
      ...config.get('pageObjects')
    })
  ]);
}
