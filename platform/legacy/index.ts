/**@internal**/
export { LegacyPlatformProxifier } from './LegacyPlatformProxifier';
/**@internal**/
export { LegacyConfigToRawConfigAdapter } from './LegacyPlatformConfig';
/**@internal**/
export { LegacyKbnServer } from './LegacyKbnServer';

import { BehaviorSubject } from 'rxjs';
import { Root } from '../root';
import { Env } from '../config';
import {
  LegacyKbnServer,
  LegacyPlatformProxifier,
  LegacyConfigToRawConfigAdapter
} from '.';

/**
 * @internal
 */
export const injectIntoKbnServer = (kbnServer: LegacyKbnServer) => {
  kbnServer.newPlatformConfig = new BehaviorSubject(kbnServer.config);

  const config$ = kbnServer.newPlatformConfig.map(
    legacyConfig => new LegacyConfigToRawConfigAdapter(legacyConfig)
  );

  const root = new Root(config$, Env.createDefault({ kbnServer }), () => {});

  kbnServer.newPlatformProxyListener = new LegacyPlatformProxifier(
    root.logger.get('legacy-platform-proxifier'),
    () => root.start(),
    () => root.shutdown()
  );
};
