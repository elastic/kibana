import { SslConfig } from './SslConfig';
import { Env } from '../../config';
import { schema, ByteSizeValue } from '@elastic/kbn-utils';

const validHostnameRegex = /^(([A-Z0-9]|[A-Z0-9][A-Z0-9\-]*[A-Z0-9])\.)*([A-Z0-9]|[A-Z0-9][A-Z0-9\-]*[A-Z0-9])$/i;
const validBasePathRegex = /(^$|^\/.*[^\/]$)/;

const { object, string, number, byteSize, maybe } = schema;

const match = (regex: RegExp, errorMsg: string) => (str: string) =>
  regex.test(str) ? undefined : errorMsg;

const createHttpSchema = object({
  host: string({
    defaultValue: 'localhost',
    validate: match(validHostnameRegex, 'must be a valid hostname')
  }),
  port: number({
    defaultValue: 5601
  }),
  maxPayload: byteSize({
    defaultValue: '1mb'
  }),
  basePath: maybe(
    string({
      validate: match(
        validBasePathRegex,
        "must start with a slash, don't end with one"
      )
    })
  ),
  ssl: SslConfig.schema
});

type HttpConfigType = schema.TypeOf<typeof createHttpSchema>;

export class HttpConfig {
  /**
   * @internal
   */
  static schema = createHttpSchema;

  host: string;
  port: number;
  maxPayload: ByteSizeValue;
  basePath?: string;
  publicDir: string;
  ssl: SslConfig;

  /**
   * @internal
   */
  constructor(config: HttpConfigType, env: Env) {
    this.host = config.host;
    this.port = config.port;
    this.maxPayload = config.maxPayload;
    this.basePath = config.basePath;
    this.publicDir = env.staticFilesDir;
    this.ssl = new SslConfig(config.ssl);
  }
}
