import type { TypeOf } from '@kbn/config-schema';
import type { getUpdateResponseBodySchema } from './schemas';
/** The response body type for updating a dashboard. */
export type DashboardUpdateResponseBody = TypeOf<ReturnType<typeof getUpdateResponseBodySchema>>;
