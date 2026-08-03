import type { DiscoverServices } from '../../build_services';
import type { DataSourceProfileService, DocumentProfileService, RootProfileService } from '../profiles';
import type { ProfileProviderSharedServices } from './profile_provider_services';
/**
 * Register profile providers for root, data source, and document contexts to the profile profile services
 * @param options Register profile provider options
 */
export declare const registerProfileProviders: ({ rootProfileService, dataSourceProfileService, documentProfileService, enabledExperimentalProfileIds, sharedServices, services, }: {
    /**
     * Root profile service
     */
    rootProfileService: RootProfileService;
    /**
     * Data source profile service
     */
    dataSourceProfileService: DataSourceProfileService;
    /**
     * Document profile service
     */
    documentProfileService: DocumentProfileService;
    /**
     * Array of experimental profile IDs which are enabled in `kibana.yml`
     */
    enabledExperimentalProfileIds: string[];
    /**
     * Shared services for profile providers
     */
    sharedServices: ProfileProviderSharedServices;
    /**
     * The base Discover services
     */
    services: DiscoverServices;
}) => void;
