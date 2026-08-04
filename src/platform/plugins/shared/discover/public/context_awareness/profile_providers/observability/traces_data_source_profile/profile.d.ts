import { type DataSourceProfileProvider } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
export declare const OBSERVABILITY_TRACES_DATA_SOURCE_PROFILE_ID = "observability-traces-data-source-profile";
export declare const createTracesDataSourceProfileProvider: ({ apmContextService, }: ProfileProviderServices) => DataSourceProfileProvider;
