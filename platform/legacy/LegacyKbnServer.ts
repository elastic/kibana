import { LegacyConfig } from './LegacyPlatformConfig';
import { LegacyPlatformProxifier } from './LegacyPlatformProxifier';

/**
 * Represents legacy kbnServer instance, provided by the legacy platform.
 * @internal
 */
export interface LegacyKbnServer {
  readonly config: LegacyConfig;
  newPlatformProxyListener: LegacyPlatformProxifier;
}
