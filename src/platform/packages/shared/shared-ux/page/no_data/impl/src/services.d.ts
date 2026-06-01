import type { FC, PropsWithChildren } from 'react';
import type { NoDataPageServices, NoDataPageKibanaDependencies } from '@kbn/shared-ux-page-no-data-types';
/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export declare const NoDataPageProvider: FC<PropsWithChildren<NoDataPageServices>>;
/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export declare const NoDataPageKibanaProvider: FC<PropsWithChildren<NoDataPageKibanaDependencies>>;
