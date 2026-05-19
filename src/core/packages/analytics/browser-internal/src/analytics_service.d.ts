import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
/** @internal */
export interface AnalyticsServiceSetupDeps {
    injectedMetadata: InternalInjectedMetadataSetup;
}
export declare class AnalyticsService {
    private readonly analyticsClient;
    private readonly subscriptionsHandler;
    constructor(core: CoreContext);
    setup({ injectedMetadata }: AnalyticsServiceSetupDeps): AnalyticsServiceSetup;
    start(): AnalyticsServiceStart;
    stop(): Promise<void>;
    /**
     * Enriches the events with a session_id, so we can correlate them and understand funnels.
     * @internal
     */
    private registerSessionIdContext;
    /**
     * Enriches the event with the build information.
     * @param core The core context.
     * @internal
     */
    private registerBuildInfoAnalyticsContext;
    /**
     * Enriches events with the current Browser's information
     * @internal
     */
    private registerBrowserInfoAnalyticsContext;
    /**
     * Enriches the events with the Elasticsearch info (cluster name, uuid and version).
     * @param injectedMetadata The injected metadata service.
     * @internal
     */
    private registerElasticsearchInfoContext;
}
