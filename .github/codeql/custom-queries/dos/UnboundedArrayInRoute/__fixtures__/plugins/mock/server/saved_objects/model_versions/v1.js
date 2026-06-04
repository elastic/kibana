// Test: Saved-object model-version schemas should be EXCLUDED (no alerts).
import { schema } from '@kbn/config-schema';

export const taskMigrationSchema = schema.object({
  scope: schema.arrayOf(schema.string()),
});
