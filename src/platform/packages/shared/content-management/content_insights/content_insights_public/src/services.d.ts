import type { FC, PropsWithChildren } from 'react';
import type { ContentInsightsClientPublic } from './client';
/**
 * Abstract external services for this component.
 */
export interface ContentInsightsServices {
    contentInsightsClient: ContentInsightsClientPublic;
    /**
     * Whether versioning is enabled for the current kibana instance. (aka is Serverless)
     * This is used to determine if we should show the version mentions in the help text.
     */
    isKibanaVersioningEnabled: boolean;
}
/**
 * Abstract external service Provider.
 */
export declare const ContentInsightsProvider: FC<PropsWithChildren<Partial<ContentInsightsServices>>>;
export declare function useServices(): ContentInsightsServices | null;
