import type { Logger } from '@kbn/logging';
import { type Provider } from '@openfeature/server-sdk';
/**
 * Handles the setting of the Feature Flags provider and any retries that may be required.
 * This method is intentionally synchronous (no async/await) to avoid holding Kibana's startup on the feature flags setup.
 * @param provider The OpenFeature provider to set up.
 * @param logger You know, for logging.
 */
export declare function setProviderWithRetries(provider: Provider, logger: Logger): void;
