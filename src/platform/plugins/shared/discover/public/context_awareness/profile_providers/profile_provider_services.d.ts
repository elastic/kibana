import { type LogsContextService, type ApmContextService } from '@kbn/discover-utils';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import type { DiscoverServices } from '../../build_services';
/**
 * Dependencies required by profile provider implementations
 */
export interface ProfileProviderSharedServicesDeps {
    logsDataAccess?: LogsDataAccessPluginStart;
    apmSourcesAccess?: ApmSourceAccessPluginStart;
}
/**
 * Shared services provided to profile provider implementations
 */
export interface ProfileProviderSharedServices {
    logsContextService: LogsContextService;
    apmContextService: ApmContextService;
}
/**
 * Services provided to profile provider implementations
 */
export type ProfileProviderServices = ProfileProviderSharedServices & DiscoverServices;
/**
 * Creates the profile provider services
 * @param _deps Profile provider dependencies
 * @returns Profile provider services
 */
export declare const createProfileProviderSharedServices: ({ logsDataAccess, apmSourcesAccess, }: ProfileProviderSharedServicesDeps) => Promise<ProfileProviderSharedServices>;
