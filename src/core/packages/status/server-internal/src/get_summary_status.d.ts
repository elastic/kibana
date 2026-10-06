import type { PluginName } from '@kbn/core-base-common';
import { type CoreStatus, type ServiceStatus } from '@kbn/core-status-common';
import type { PluginStatus } from './types';
interface GetSummaryStatusParams {
    serviceStatuses?: CoreStatus;
    pluginStatuses?: Record<PluginName, PluginStatus>;
}
/**
 * Returns a single {@link ServiceStatus} that summarizes the most severe status level from a group of statuses.
 */
export declare const getSummaryStatus: ({ serviceStatuses, pluginStatuses, }: GetSummaryStatusParams) => ServiceStatus;
export {};
