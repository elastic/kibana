import type { FC, PropsWithChildren } from 'react';
import type { NoDataConfigPageServices, NoDataConfigPageKibanaDependencies } from '@kbn/shared-ux-page-no-data-config-types';
/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export declare const NoDataConfigPageProvider: FC<PropsWithChildren<NoDataConfigPageServices>>;
/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export declare const NoDataConfigPageKibanaProvider: FC<PropsWithChildren<NoDataConfigPageKibanaDependencies>>;
