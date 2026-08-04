import type { TypeOf } from '@kbn/config-schema';
import type { getReadResponseBodySchema } from './schemas';
/** The response body type for reading a dashboard. */
export type DashboardReadResponseBody = TypeOf<ReturnType<typeof getReadResponseBodySchema>>;
