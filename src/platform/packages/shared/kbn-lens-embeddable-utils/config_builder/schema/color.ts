import { schema } from '@kbn/config-schema';

const colorByValueSchema = schema.object({
    type: schema.literal('dynamic'),
    min: schema.number({ meta: { description: 'Minimum value for color range' } }),
    max: schema.number({ meta: { description: 'Maximum value for color range' } }),
    range: schema.oneOf([
      schema.literal('absolute'),
      schema.literal('percentage')
    ], { meta: { description: 'Type of range (absolute or percentage)' } }),
    steps: schema.arrayOf(
      schema.oneOf([
        schema.object({
          type: schema.literal('from'),
          from: schema.number({ meta: { description: 'From value' } }),
          color: schema.string({ meta: { description: 'Color' } })
        }),
        schema.object({
          type: schema.literal('to'),
          to: schema.number({ meta: { description: 'To value' } }),
          color: schema.string({ meta: { description: 'Color' } })
        }),
        schema.object({
          type: schema.literal('exact'),
          value: schema.number({ meta: { description: 'Exact value' } }),
          color: schema.string({ meta: { description: 'Color' } })
        })
      ])
    )
  });
  
  const staticColorSchema = schema.object({
    type: schema.literal('static'),
    color: schema.string({ meta: { description: 'Static color' } })
  });
  
  const colorDefinitionSchema = schema.object({
    categorical: schema.maybe(schema.object({
      index: schema.number(),
      palette: schema.maybe(schema.string())
    })),
    static: schema.maybe(schema.string())
  });
  
  const colorMappingSchema = schema.oneOf([
    schema.object({
      palette: schema.string(),
      mode: schema.literal("categorical"),
      colorMapping: schema.object({
        values: schema.arrayOf(schema.string())
      }),
      otherColors: colorDefinitionSchema
    }),
    schema.object({
      palette: schema.string(),
      mode: schema.literal("gradient"),
      gradient: schema.arrayOf(colorDefinitionSchema),
      colorMapping: schema.arrayOf(
        schema.object({
          values: schema.arrayOf(schema.string())
        })
      ),
      otherColors: colorDefinitionSchema
    })
  ]);
  
  export const coloringTypeSchema = schema.oneOf([
    colorByValueSchema,
    staticColorSchema
  ])