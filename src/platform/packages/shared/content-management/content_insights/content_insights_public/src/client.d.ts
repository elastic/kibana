import type { Logger } from '@kbn/logging';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ContentInsightsStats } from '@kbn/content-management-content-insights-server';
export type ContentInsightsEventTypes = 'viewed';
/**
 * Public interface of the Content Management Insights service.
 */
export interface ContentInsightsClientPublic {
    track(id: string, eventType: ContentInsightsEventTypes): void;
    getStats(id: string, eventType: ContentInsightsEventTypes): Promise<ContentInsightsStats>;
}
/**
 * Client for the Content Management Insights service.
 */
export declare class ContentInsightsClient implements ContentInsightsClientPublic {
    private readonly deps;
    private readonly config;
    private logger;
    constructor(deps: {
        http: HttpStart;
        logger: Logger;
    }, config: {
        domainId: string;
    });
    track(id: string, eventType: ContentInsightsEventTypes): void;
    getStats(id: string, eventType: ContentInsightsEventTypes): Promise<ContentInsightsStats>;
}
