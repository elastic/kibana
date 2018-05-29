/** @internal */
export { LegacyPlatformProxifier } from './legacy_platform_proxifier';
/** @internal */
export {
  LegacyConfigToRawConfigAdapter,
  LegacyConfig,
} from './legacy_platform_config';
/** @internal */
export { LegacyKbnServer } from './legacy_kbn_server';

import {
  LegacyConfig,
  LegacyConfigToRawConfigAdapter,
  LegacyKbnServer,
  LegacyPlatformProxifier,
} from '.';
import { BehaviorSubject, k$, map } from '../../lib/kbn_observable';
import { Env } from '../config';
import { Root } from '../root';

/**
 * @internal
 */
export const injectIntoKbnServer = (rawKbnServer: any) => {
  const legacyConfig$ = new BehaviorSubject(rawKbnServer.config);
  const config$ = k$(legacyConfig$)(
    map(legacyConfig => new LegacyConfigToRawConfigAdapter(legacyConfig))
  );

  rawKbnServer.newPlatform = {
    // Custom HTTP Listener that will be used within legacy platform by HapiJS server.
    proxyListener: new LegacyPlatformProxifier(
      new Root(
        config$,
        Env.createDefault({ kbnServer: new LegacyKbnServer(rawKbnServer) })
      )
    ),

    // Propagates legacy config updates to the new platform.
    updateConfig(legacyConfig: LegacyConfig) {
      legacyConfig$.next(legacyConfig);
    },
  };
};
