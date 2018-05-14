import { SslConfig } from './ssl_config';
import { Env } from '../../config';
import { schema, ByteSizeValue } from '@kbn/utils';

const validHostnameRegex = /^(([A-Z0-9]|[A-Z0-9][A-Z0-9\-]*[A-Z0-9])\.)*([A-Z0-9]|[A-Z0-9][A-Z0-9\-]*[A-Z0-9])$/i;
const validBasePathRegex = /(^$|^\/.*[^\/]$)/;

const { arrayOf, boolean, object, string, number, byteSize, maybe, oneOf } = schema;

const match = (regex: RegExp, errorMsg: string) => (str: string) =>
  regex.test(str) ? undefined : errorMsg;

const createHttpSchema = object({
  host: string({
    defaultValue: 'localhost',
    validate: match(validHostnameRegex, 'must be a valid hostname'),
  }),
  port: number({
    defaultValue: 5601,
  }),
  cors: oneOf([
    boolean({ defaultValue: false }),
    object({
      origin: arrayOf(
        string({ defaultValue: '*://localhost:9876' })
      )
    }),
  ]),
  maxPayload: byteSize({
    defaultValue: '1048576b',
  }),
  basePath: maybe(
    string({
      validate: match(
        validBasePathRegex,
        "must start with a slash, don't end with one"
      ),
    })
  ),
  rewriteBasePath: boolean( { defaultValue: false }),
  ssl: SslConfig.schema,
}, {
  validate: config => {
    if (!config.basePath && config.rewriteBasePath) {
      return 'cannot use [rewriteBasePath] when [basePath] is not specified';
    }
  },
});

type HttpConfigType = schema.TypeOf<typeof createHttpSchema>;

export class HttpConfig {
  /**
   * @internal
   */
  static schema = createHttpSchema;

  host: string;
  port: number;
  cors: boolean | { origin: string[] };
  maxPayload: ByteSizeValue;
  basePath?: string;
  rewriteBasePath: boolean;
  publicDir: string;
  ssl: SslConfig;

  /**
   * @internal
   */
  constructor(config: HttpConfigType, env: Env) {
    this.host = config.host;
    this.port = config.port;
    this.cors = config.cors;
    this.maxPayload = config.maxPayload;
    this.basePath = config.basePath;
    this.rewriteBasePath = config.rewriteBasePath;
    this.publicDir = env.staticFilesDir;
    this.ssl = new SslConfig(config.ssl);
  }
}
