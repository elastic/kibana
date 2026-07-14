import type { CoreContext } from '@kbn/core-base-server-internal';
import type { AnalyticsServiceSetup, AnalyticsServiceStart, AnalyticsServicePreboot } from '@kbn/core-analytics-server';
export declare class AnalyticsService {
    private readonly analyticsClient;
    constructor(core: CoreContext);
    preboot(): AnalyticsServicePreboot;
    setup(): AnalyticsServiceSetup;
    start(): AnalyticsServiceStart;
    stop(): Promise<void>;
    /**
     * Enriches the event with the build information.
     * @param core The core context.
     * @internal
     */
    private registerBuildInfoAnalyticsContext;
}
