// Test: Saved-object model-version schemas should be EXCLUDED (no alerts).
// These define forward-compatibility / migration shapes.
import { schema } from '@kbn/config-schema';

export const modelVersionSchema = schema.object({
  taskType: schema.string(),
  params: schema.string(),
  state: schema.string(),
});
