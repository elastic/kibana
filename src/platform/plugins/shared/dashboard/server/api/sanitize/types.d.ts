import type { TypeOf } from '@kbn/config-schema';
import type { getSanitizeResponseBodySchema } from './schemas';
/** The response body type for sanitizing a dashboard. */
export type DashboardSanitizeResponseBody = TypeOf<ReturnType<typeof getSanitizeResponseBodySchema>>;
