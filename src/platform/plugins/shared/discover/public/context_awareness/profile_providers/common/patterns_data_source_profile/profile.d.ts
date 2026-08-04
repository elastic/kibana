import type { DataSourceProfileProvider } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
export declare const createPatternsDataSourceProfileProvider: (services: ProfileProviderServices) => DataSourceProfileProvider<{
    patternColumns: string[];
    sparklineColumns: string[];
}>;
