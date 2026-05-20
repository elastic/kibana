import type { BaseProfileProvider, BaseProfileService } from '../profile_service';
import type { DiscoverServices } from '../../build_services';
/**
 * Register enabled profile providers to the provided profile service
 * @param options Register enabled profile providers options
 */
export declare const registerEnabledProfileProviders: <TProvider extends BaseProfileProvider<{}, {}>, TService extends BaseProfileService<TProvider>>({ profileService, providers: availableProviders, enabledExperimentalProfileIds, services, }: {
    /**
     * Profile service to register providers
     */
    profileService: TService;
    /**
     * Array of available profile providers
     */
    providers: TProvider[];
    /**
     * Array of experimental profile IDs which are enabled in `kibana.yml`
     */
    enabledExperimentalProfileIds?: string[];
    services: DiscoverServices;
}) => void;
