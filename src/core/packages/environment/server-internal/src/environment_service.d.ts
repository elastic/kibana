import type { CoreContext } from '@kbn/core-base-server-internal';
import type { AnalyticsServicePreboot } from '@kbn/core-analytics-server';
/**
 * @internal
 */
export interface EnvironmentServicePrebootDeps {
    /**
     * {@link AnalyticsServicePreboot}
     */
    analytics: AnalyticsServicePreboot;
}
/**
 * @internal
 */
export interface InternalEnvironmentServicePreboot {
    /**
     * Retrieve the Kibana instance uuid.
     */
    instanceUuid: string;
}
/**
 * @internal
 */
export type InternalEnvironmentServiceSetup = InternalEnvironmentServicePreboot;
/** @internal */
export declare class EnvironmentService {
    private readonly log;
    private readonly configService;
    private uuid;
    constructor(core: CoreContext);
    preboot({ analytics }: EnvironmentServicePrebootDeps): Promise<{
        instanceUuid: string;
    }>;
    setup(): {
        instanceUuid: string;
    };
}
