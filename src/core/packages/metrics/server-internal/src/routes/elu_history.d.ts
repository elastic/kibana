import type { IRouter } from '@kbn/core-http-server';
import type { EluMetrics } from '@kbn/core-metrics-server';
/**
 * Intended for exposing metrics over HTTP that we do not want to include in the /api/stats endpoint, yet.
 */
export declare function registerEluHistoryRoute(router: IRouter, elu: () => EluMetrics): void;
