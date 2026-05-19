import type { Logger as OpenFeatureLogger } from '@openfeature/server-sdk';
import type { Logger } from '@kbn/logging';
/**
 * The way OpenFeature logs messages is very similar to the console.log approach,
 * which is not compatible with our LogMeta approach. This can result in our log removing information like any 3rd+
 * arguments passed or the error.message when using log('message', error).
 *
 * This wrapper addresses this by making it ECS-compliant.
 * @param logger The Kibana logger
 */
export declare function createOpenFeatureLogger(logger: Logger): OpenFeatureLogger;
