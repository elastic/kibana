import type { FC, PropsWithChildren } from 'react';
import type { Services, AnalyticsNoDataPageServices, AnalyticsNoDataPageKibanaDependencies } from '@kbn/shared-ux-page-analytics-no-data-types';
/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export declare const AnalyticsNoDataPageProvider: FC<PropsWithChildren<AnalyticsNoDataPageServices>>;
/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export declare const AnalyticsNoDataPageKibanaProvider: FC<PropsWithChildren<AnalyticsNoDataPageKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare function useServices(): Services;
