import type { TypeOf } from '@kbn/config-schema';
import type { searchRequestParamsSchema, searchResponseBodySchema } from './schemas';
/** The request parameters for searching dashboards */
export type DashboardSearchRequestParams = TypeOf<typeof searchRequestParamsSchema>;
/** The response body type for searching dashboards. */
export type DashboardSearchResponseBody = TypeOf<typeof searchResponseBodySchema>;
