import type { OnRequestHandlerFactory } from '../cluster_client';
/**
 * Returns an {@link OnRequestHandlerFactory} that maps routing options to the
 * appropriate CPS `OnRequestHandler` for each client scope, composed with
 * timing instrumentation.
 *
 * @internal
 */
export declare function getRequestHandlerFactory(cpsEnabled: boolean, esTimingEnabled?: boolean): OnRequestHandlerFactory;
