import type { AnalyticsServicePreboot } from '@kbn/core-analytics-server';
import type { HttpServicePreboot } from '@kbn/core-http-server';
import type { PrebootServicePreboot } from '@kbn/core-preboot-server';
import type { ElasticsearchServicePreboot } from '@kbn/core-elasticsearch-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
/**
 * Context passed to the `setup` method of `preboot` plugins.
 * @public
 */
export interface CorePreboot {
    /** {@link AnalyticsServicePreboot} */
    analytics: AnalyticsServicePreboot;
    /** {@link ElasticsearchServicePreboot} */
    elasticsearch: ElasticsearchServicePreboot;
    /** {@link HttpServicePreboot} */
    http: HttpServicePreboot<RequestHandlerContext>;
    /** {@link PrebootServicePreboot} */
    preboot: PrebootServicePreboot;
}
