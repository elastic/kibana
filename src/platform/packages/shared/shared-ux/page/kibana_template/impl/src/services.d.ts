import type { FC, PropsWithChildren } from 'react';
import type { KibanaPageTemplateServices, KibanaPageTemplateKibanaDependencies } from '@kbn/shared-ux-page-kibana-template-types';
/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export declare const KibanaPageTemplateProvider: FC<PropsWithChildren<KibanaPageTemplateServices>>;
/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export declare const KibanaPageTemplateKibanaProvider: FC<PropsWithChildren<KibanaPageTemplateKibanaDependencies>>;
