// Test: Dashboard saved-object schemas should be EXCLUDED (no alerts).
import { schema } from '@kbn/config-schema';

export const dashboardAttributesSchema = schema.object({
  title: schema.string(),
  description: schema.string(),
});
