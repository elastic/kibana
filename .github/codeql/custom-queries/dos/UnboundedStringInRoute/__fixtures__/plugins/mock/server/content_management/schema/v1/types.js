// Test: Content-management layer schemas should be EXCLUDED (no alerts).
// These define CM CRUD shapes for maps, lens, links, etc.
import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';

export const cmAttributesSchema = schema.object({
  title: schema.string(),
  description: schema.string(),
});

export const zodCmSchema = z.object({
  name: z.string(),
  type: z.string(),
});
