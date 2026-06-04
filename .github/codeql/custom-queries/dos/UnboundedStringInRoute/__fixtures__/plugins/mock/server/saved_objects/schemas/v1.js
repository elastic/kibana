// Test: Saved-object attribute schemas should be EXCLUDED (no alerts).
// These define data-at-rest shapes, not HTTP request payloads.
import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';

export const rawRuleSchema = schema.object({
  name: schema.string(),
  description: schema.string(),
  status: schema.oneOf([schema.literal('ok'), schema.literal('error')]),
});

export const zodSoSchema = z.object({
  title: z.string(),
  state: z.string(),
});
