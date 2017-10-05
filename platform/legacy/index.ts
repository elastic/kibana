/**@internal**/
export { LegacyPlatformProxifier } from './LegacyPlatformProxifier';
/**@internal**/
export {
  LegacyConfigToRawConfigAdapter,
  LegacyConfig
} from './LegacyPlatformConfig';
/**@internal**/
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

/**
 * @internal
 */
export const injectIntoKbnServer = (kbnServer: LegacyKbnServer) => {
  const legacyConfig$ = new BehaviorSubject(kbnServer.config);
  const config$ = legacyConfig$.map(
    legacyConfig => new LegacyConfigToRawConfigAdapter(legacyConfig)
  );

  kbnServer.updateNewPlatformConfig = (legacyConfig: LegacyConfig) => {
    legacyConfig$.next(legacyConfig);
  };

  kbnServer.newPlatformProxyListener = new LegacyPlatformProxifier(
    new Root(config$, Env.createDefault({ kbnServer }))
  );
};
