import type { DataSourceProfileProvider } from '../../../profiles';
export type MetricsExperienceDataSourceProfileProvider = DataSourceProfileProvider<{}>;
export declare const METRICS_DATA_SOURCE_PROFILE_ID = "metrics-data-source-profile";
export declare const createMetricsDataSourceProfileProvider: () => MetricsExperienceDataSourceProfileProvider;
