// Test: Content-management layer schemas should be EXCLUDED (no alerts).
import { schema } from '@kbn/config-schema';

export const cmAttributesSchema = schema.object({
  references: schema.arrayOf(schema.object({
    name: schema.string(),
    type: schema.string(),
    id: schema.string(),
  })),
});
