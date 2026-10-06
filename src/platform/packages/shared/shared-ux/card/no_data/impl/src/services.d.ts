import type { FC, PropsWithChildren } from 'react';
import type { Services, NoDataCardServices, NoDataCardKibanaDependencies } from '@kbn/shared-ux-card-no-data-types';
/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export declare const NoDataCardProvider: FC<PropsWithChildren<NoDataCardServices>>;
/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export declare const NoDataCardKibanaProvider: FC<PropsWithChildren<NoDataCardKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare function useServices(): Services;
