// Test: Dashboard saved-object schemas should be EXCLUDED (no alerts).
import { schema } from '@kbn/config-schema';

export const dashboardAttributesSchema = schema.object({
  panels: schema.arrayOf(schema.object({
    id: schema.string(),
    type: schema.string(),
  })),
});
