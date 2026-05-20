import type { TypeOf } from '@kbn/config-schema';
import type { getCreateResponseBodySchema } from './schemas';
/** The response body type for creating a dashboard. */
export type DashboardCreateResponseBody = TypeOf<ReturnType<typeof getCreateResponseBodySchema>>;
