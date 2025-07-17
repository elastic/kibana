import { schema } from '@kbn/config-schema';

export const filterSchema = schema.object({
    /**
     * Filter query
     */
    query: schema.object({
      language: schema.oneOf([
        schema.literal('kuery'),
        schema.literal('lucene'),
      ]),
      /**
       * Filter query
       */
      query: schema.string({
        meta: {
          description: 'Filter query'
        }
      }),
    }),
    /**
     * Label for the filter
     */
    label: schema.maybe(schema.string({
      meta: {
        description: 'Label for the filter'
      }
    })),
  });