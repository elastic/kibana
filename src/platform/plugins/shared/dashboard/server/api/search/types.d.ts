import type { TypeOf } from '@kbn/config-schema';
import type { asCodeSearchRequestSchema } from '@kbn/as-code-shared-schemas';
import type { legacySearchRequestParamsSchema, legacySearchResponseBodySchema, searchResponseBodySchema } from './schemas';
/** The request parameters for searching dashboards */
export type DashboardSearchRequestParams = TypeOf<typeof asCodeSearchRequestSchema>;
/** The response body type for searching dashboards. */
export type DashboardSearchResponseBody = TypeOf<typeof searchResponseBodySchema>;
/** LEGACY **/
/** The request parameters for searching dashboards */
export type LegacyDashboardSearchRequestParams = TypeOf<typeof legacySearchRequestParamsSchema>;
/** The response body type for searching dashboards. */
export type LegacyDashboardSearchResponseBody = TypeOf<typeof legacySearchResponseBodySchema>;
