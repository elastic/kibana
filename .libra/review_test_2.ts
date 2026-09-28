import { schema } from '@kbn/config-schema';

export const searchRequestSchema = schema.object({
  query: schema.string(),
});
