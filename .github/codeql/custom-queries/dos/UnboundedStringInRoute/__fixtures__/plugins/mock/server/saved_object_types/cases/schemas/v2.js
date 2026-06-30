// Test: saved_object_types/*/schemas/* should be EXCLUDED (no alerts).
import { schema } from '@kbn/config-schema';

export const caseSoSchema = schema.object({
  title: schema.string(),
  owner: schema.string(),
});
