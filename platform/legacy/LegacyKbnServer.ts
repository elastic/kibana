import { LegacyConfig } from './LegacyPlatformConfig';
import { LegacyPlatformProxifier } from './LegacyPlatformProxifier';

/**
 * Represents legacy kbnServer instance, provided by the legacy platform.
 * @internal
 */
export interface LegacyKbnServer {
  readonly config: LegacyConfig;
  readonly server: { log: (...args: any[]) => void };

  /**
   * Custom HTTP Listener provided by the new platform and that will be used
   * within legacy platform by HapiJS server.
   */
  newPlatformProxyListener: LegacyPlatformProxifier;

  /**
   * Propagates legacy config updates to the new platform.
   */
  updateNewPlatformConfig: (legacyConfig: LegacyConfig) => void;
}
