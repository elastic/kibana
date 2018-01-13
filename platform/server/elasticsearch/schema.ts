import { schema } from '@elastic/kbn-sdk';

/**
 * @internal
 */
export const sslSchema = schema.object({
  verificationMode: schema.oneOf([
    schema.literal('none'),
    schema.literal('certificate'),
    schema.literal('full')
  ]),
  certificateAuthorities: schema.maybe(
    schema.arrayOf(schema.string(), { minSize: 1 })
  ),
  certificate: schema.maybe(schema.string()),
  key: schema.maybe(schema.string()),
  keyPassphrase: schema.maybe(schema.string())
});

const DEFAULT_REQUEST_HEADERS = ['authorization'];

/**
 * @internal
 */
const sharedElasticsearchFields = {
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
  ssl: schema.maybe(sslSchema)
};

/**
 * @internal
 */
const clusterSchema = schema.object({
  ...sharedElasticsearchFields
});

/**
 * @internal
 */
export const tribeSchema = schema.object({
  ...sharedElasticsearchFields
});

/**
 * @internal
 */
export const elasticsearchSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  ...sharedElasticsearchFields,
  healthCheck: schema.object({
    delay: schema.duration({ defaultValue: '2500ms' })
  }),
  tribe: schema.maybe(tribeSchema)
});

/**
 * @internal
 */
export type ElasticsearchConfigsSchema = schema.TypeOf<
  typeof elasticsearchSchema
>;

/**
 * @internal
 */
export type ClusterSchema = schema.TypeOf<typeof clusterSchema>;
