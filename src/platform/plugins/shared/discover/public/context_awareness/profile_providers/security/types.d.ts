import type { ProfileProviderServices } from '../profile_provider_services';
export type SecurityProfileProviderFactory<T> = (services: ProfileProviderServices) => T;
