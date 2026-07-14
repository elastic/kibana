import type { KibanaRequest } from '@kbn/core-http-server';
import type { OnRequestHandler } from '../create_transport';
/**
 * Returns an {@link OnRequestHandler} that instruments ES request timing
 * and stores timing context for response-phase measurement.
 *
 * @param kibanaRequest - Optional KibanaRequest to attach Server-Timing measurements to
 * @returns Handler that sets timing context in options.context
 *
 * @internal
 */
export declare function getTimingRequestHandler(kibanaRequest?: KibanaRequest): OnRequestHandler;
