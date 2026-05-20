import type { DataSourceProfileProvider } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
export declare const SPARKLINE_DATA_SOURCE_PROFILE_ID = "sparkline-data-source-profile";
export type SparklineDataSourceProfileProvider = DataSourceProfileProvider<{
    sparklineColumns: string[];
}>;
export declare const createSparklineDataSourceProfileProvider: (services: ProfileProviderServices) => SparklineDataSourceProfileProvider;
