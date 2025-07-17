import { schema } from '@kbn/config-schema';

export const datasetTypeSchema = schema.oneOf([
    schema.object({
      type: schema.literal('dataView'),
      /**
       * Name of the kibana dataview
       */
      name: schema.string({
        meta: {
          description: 'Name of the kibana dataview'
        }
      }),
    }),
    schema.object({
      type: schema.literal('index'),
      /**
       * Name of the index
       */
      index: schema.string({
        meta: {
          description: 'Name of the index'
        }
      }),
      /**
       * Name of the time field
       */
      time_field: schema.string({
        meta: {
          description: 'Name of the time field'
        }
      }),
      /**
       * Runtime fields
       */
      runtime_fields: schema.maybe(
        schema.arrayOf(
          schema.object({
            type: schema.string({
              meta: {
                description: 'Type of the runtime field'
              }
            }),
            name: schema.string({
              meta: {
                description: 'Name of the runtime field'
              }
            }),
            format: schema.maybe(schema.any()),
          })
        )
      ),
    }),
    schema.object({
      type: schema.literal('esql'),
      /**
       * ESQL query
       */
      query: schema.string({
        meta: {
          description: 'ESQL query'
        }
      }),
    }),
    schema.object({
      type: schema.literal('table'),
      /**
       * Kibana Datatable
       */
      table: schema.any({
        meta: {
          description: 'kibana datatable'
        }
      }),
    }),
  ]);