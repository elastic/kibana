/**@internal**/
export { LegacyPlatformProxifier } from './LegacyPlatformProxifier';
/**@internal**/
export {
  LegacyConfigToRawConfigAdapter,
  LegacyConfig
} from './LegacyPlatformConfig';
/**@internal**/
export { LegacyKbnServer } from './LegacyKbnServer';

import { k$, map, BehaviorSubject } from 'kbn-observable';
import { Root } from '../root';
import { Env } from '../config';
import {
  LegacyConfig,
  LegacyKbnServer,
  LegacyPlatformProxifier,
  LegacyConfigToRawConfigAdapter
} from '.';

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
    }
  };
};
