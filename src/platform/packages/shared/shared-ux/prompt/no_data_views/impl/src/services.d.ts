import type { FC, PropsWithChildren } from 'react';
import type { NoDataViewsPromptServices, NoDataViewsPromptKibanaDependencies } from '@kbn/shared-ux-prompt-no-data-views-types';
/**
 * Abstract external service Provider.
 */
export declare const NoDataViewsPromptProvider: FC<PropsWithChildren<NoDataViewsPromptServices>>;
/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export declare const NoDataViewsPromptKibanaProvider: FC<PropsWithChildren<NoDataViewsPromptKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare function useServices(): NoDataViewsPromptServices;
