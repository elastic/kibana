export { LegacyPlatformProxifier } from './LegacyPlatformProxifier';
export {
  LegacyConfigToRawConfigAdapter,
  LegacyConfig
} from './LegacyPlatformConfig';
export { LegacyKbnServer } from './LegacyKbnServer';

import { BehaviorSubject } from 'rxjs';
import { Root } from '../root';
import { Env } from '../config';
import {
  LegacyConfig,
  LegacyKbnServer,
  LegacyPlatformProxifier,
  LegacyConfigToRawConfigAdapter
} from '.';

export const injectIntoKbnServer = (rawKbnServer: any) => {
  const legacyConfig$ = new BehaviorSubject(rawKbnServer.config);
  const config$ = legacyConfig$.map(
    legacyConfig => new LegacyConfigToRawConfigAdapter(legacyConfig)
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
