import type { FC, PropsWithChildren } from 'react';
import type { Services, KibanaNoDataPageServices, KibanaNoDataPageKibanaDependencies } from '@kbn/shared-ux-page-kibana-no-data-types';
/**
 * A Context Provider that provides services to the component.
 */
export declare const KibanaNoDataPageProvider: FC<PropsWithChildren<KibanaNoDataPageServices>>;
/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export declare const KibanaNoDataPageKibanaProvider: FC<PropsWithChildren<KibanaNoDataPageKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare function useServices(): Services;
