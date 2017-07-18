import {
  object,
  oneOf,
  literal,
  string,
  boolean,
  maybe,
  arrayOf,
  duration,
  TypeOf
} from '../../lib/schema';

export const sslSchema = object({
  verificationMode: oneOf([
    literal('none'),
    literal('certificate'),
    literal('full')
  ]),
  certificateAuthorities: arrayOf(string(), {
    minSize: 1
  }),
  certificate: string(),
  key: string(),
  keyPassphrase: string()
});

const DEFAULT_REQUEST_HEADERS = ['authorization'];

const sharedClusterFields = {
  url: string({ defaultValue: 'http://localhost:9200' }),
  preserveHost: boolean({ defaultValue: true }),
  username: maybe(string()),
  password: maybe(string()),
  customHeaders: maybe(object({})),
  requestHeadersWhitelist: arrayOf(string(), {
    defaultValue: DEFAULT_REQUEST_HEADERS
  }),
  shardTimeout: duration({ defaultValue: '30s' }),
  requestTimeout: duration({ defaultValue: '30s' }),
  pingTimeout: duration({ defaultValue: '30s' }),
  startupTimeout: duration({ defaultValue: '5s' }),
  logQueries: boolean({ defaultValue: false }),
  apiVersion: string({ defaultValue: 'master' }),
  ssl: maybe(sslSchema)
};

const clusterSchema = object({
  ...sharedClusterFields
});

export const tribeSchema = object({
  ...sharedClusterFields
});

export const elasticsearchSchema = object({
  enabled: boolean({ defaultValue: true }),
  ...sharedClusterFields,
  healthCheck: object({
    delay: duration({ defaultValue: '2500ms' })
  }),
  tribe: maybe(tribeSchema)
});

export type ElasticsearchConfigsSchema = TypeOf<typeof elasticsearchSchema>;

export type ClusterSchema = TypeOf<typeof clusterSchema>;
