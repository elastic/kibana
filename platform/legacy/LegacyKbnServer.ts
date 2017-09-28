import { BehaviorSubject } from 'rxjs';
import { LegacyConfig } from './LegacyPlatformConfig';
import { LegacyPlatformProxifier } from './LegacyPlatformProxifier';

/**
 * Represents legacy kbnServer instance, provided by the legacy platform.
 * @internal
 */
export interface LegacyKbnServer {
  readonly config: LegacyConfig;

  /**
   * Custom HTTP Listener provided by the new platform and that will be used
   * within legacy platform by HapiJS server.
   */
  newPlatformProxyListener: LegacyPlatformProxifier;

  /**
   * Custom subscription that is used by the legacy platform to propagate
   * config updates to the new platform.
   */
  newPlatformConfig: BehaviorSubject<LegacyConfig>;
}
