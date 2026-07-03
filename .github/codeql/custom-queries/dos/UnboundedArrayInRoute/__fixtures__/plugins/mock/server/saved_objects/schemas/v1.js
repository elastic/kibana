// Test: Saved-object attribute schemas should be EXCLUDED (no alerts).
// These define data-at-rest shapes, not HTTP request payloads.
import { schema } from '@kbn/config-schema';

export const rawRuleSchema = schema.object({
  tags: schema.arrayOf(schema.string()),
  ids: schema.arrayOf(schema.number()),
});
