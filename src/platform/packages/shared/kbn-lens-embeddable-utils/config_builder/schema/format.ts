import { schema } from '@kbn/config-schema';

const numericFormatSchema = schema.object({
    type: schema.oneOf([
      schema.literal('number'),
      schema.literal('percent'),
    ]),
    /**
     * Number of decimals
     */
    decimals: schema.number({ 
      defaultValue: 2,
      meta: { 
        description: 'Number of decimals' 
      } 
    }),
    /**
     * Suffix
     */
    suffix: schema.string({ 
      defaultValue: '',
      meta: {
        description: 'Suffix'
      }
    }),
    /**
     * Whether to use compact notation
     */
    compact: schema.boolean({ 
      defaultValue: false, 
      meta: { 
        description: 'Whether to use compact notation' 
      } 
    }),
  });
  
  const byteFormatSchema = schema.object({
    type: schema.oneOf([
      schema.literal('bits'),
      schema.literal('bytes'),
    ]),
    /**
     * Number of decimals
     */
    decimals: schema.maybe(schema.number({
      meta: {
        description: 'Number of decimals'
      }
    })),
    /**
     * Suffix
     */
    suffix: schema.maybe(schema.string({
      meta: {
        description: 'Suffix'
      }
    })),
  });
  
  const durationFormatSchema = schema.object({
    type: schema.literal('duration'),
    /**
     * From
     */
    from: schema.string({
      meta: {
        description: 'From'
      }
    }),
    /**
     * To
     */
    to: schema.string({
      meta: {
        description: 'To'
      }
    }),
    /**
     * Suffix
     */
    suffix: schema.maybe(schema.string({
      meta: {
        description: 'Suffix'
      }
    })),
  });
  
  const customFormatSchema = schema.object({
    type: schema.literal('custom'),
    /**
     * Pattern
     */
    pattern: schema.string({
      meta: {
        description: 'Pattern'
      }
    })
  });
  
  /**
   * Format configuration
   */
  export const formatTypeSchema = schema.oneOf([
    numericFormatSchema,
    byteFormatSchema,
    durationFormatSchema,
    customFormatSchema
  ]);