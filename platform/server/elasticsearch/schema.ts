import { Schema, typeOfSchema } from '../../types';

export const createSslSchema = (schema: Schema) =>
  schema.object({
    verificationMode: schema.oneOf([
      schema.literal('none'),
      schema.literal('certificate'),
      schema.literal('full')
    ]),
    certificateAuthorities: schema.arrayOf(schema.string(), {
      minSize: 1
    }),
    certificate: schema.string(),
    key: schema.string(),
    keyPassphrase: schema.string()
  })

const DEFAULT_REQUEST_HEADERS = ['authorization'];

const createSharedFields = (schema: Schema) => ({
  url: schema.string({ defaultValue: 'http://localhost:9200' }),
  preserveHost: schema.boolean({ defaultValue: true }),
  username: schema.maybe(schema.string()),
  password: schema.maybe(schema.string()),
  customHeaders: schema.maybe(schema.object({})),
  requestHeadersWhitelist: schema.arrayOf(schema.string(), {
    defaultValue: DEFAULT_REQUEST_HEADERS
  }),
  shardTimeout: schema.duration({ defaultValue: '30s' }),
  requestTimeout: schema.duration({ defaultValue: '30s' }),
  pingTimeout: schema.duration({ defaultValue: '30s' }),
  startupTimeout: schema.duration({ defaultValue: '5s' }),
  logQueries: schema.boolean({ defaultValue: false }),
  apiVersion: schema.string({ defaultValue: 'master' }),
  ssl: schema.maybe(createSslSchema(schema))
})

const clusterSchema = (schema: Schema) =>
  schema.object({
    ...createSharedFields(schema)
  })

export const createTribeSchema = (schema: Schema) =>
  schema.object({
    ...createSharedFields(schema)
  });

export const createElasticsearchSchema = (schema: Schema) =>
  schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    ...createSharedFields(schema),
    healthCheck: schema.object({
      delay: schema.duration({ defaultValue: '2500ms' })
    }),
    tribe: schema.maybe(createTribeSchema(schema))
  });

const elasticsearchConfigType = typeOfSchema(createElasticsearchSchema);

export type ElasticsearchConfigsSchema = typeof elasticsearchConfigType;

const clusterConfigType = typeOfSchema(clusterSchema);
export type ClusterSchema = typeof clusterConfigType;
