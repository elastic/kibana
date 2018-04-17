import crypto from 'crypto';
import { has } from 'lodash';
import { schema } from '@kbn/utils';

const { object, boolean, string, arrayOf, oneOf, literal, maybe } = schema;

// `crypto` type definitions doesn't currently include `crypto.constants`, see
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/fa5baf1733f49cf26228a4e509914572c1b74adf/types/node/v6/index.d.ts#L3412
const cryptoConstants = (crypto as any).constants;

const sslSchema = object(
  {
    enabled: boolean({
      defaultValue: false,
    }),
    certificate: maybe(string()),
    key: maybe(string()),
    keyPassphrase: maybe(string()),
    keystore: object({
      path: maybe(string()),
      password: maybe(string())
    }),
    certificateAuthorities: maybe(arrayOf(string())),
    supportedProtocols: maybe(
      arrayOf(oneOf([literal('TLSv1'), literal('TLSv1.1'), literal('TLSv1.2')]))
    ),
    cipherSuites: arrayOf(string(), {
      defaultValue: cryptoConstants.defaultCoreCipherList.split(':'),
    }),
  },
  {
    validate: ssl => {
      if (ssl.enabled && (!has(ssl, 'certificate') || !has(ssl, 'key'))) {
        return 'must specify [certificate] and [key] when ssl is enabled';
      }
    },
  }
);

type SslConfigType = schema.TypeOf<typeof sslSchema>;

export class SslConfig {
  /**
   * @internal
   */
  static schema = sslSchema;

  enabled: boolean;
  key: string | undefined;
  certificate: string | undefined;
  certificateAuthorities: string[] | undefined;
  keyPassphrase: string | undefined;
  keystore: {
    path: string | undefined,
    password: string | undefined
  };
  cipherSuites: string[];
  supportedProtocols: string[] | undefined;

  /**
   * @internal
   */
  constructor(config: SslConfigType) {
    this.enabled = config.enabled;
    this.key = config.key;
    this.certificate = config.certificate;
    this.certificateAuthorities = config.certificateAuthorities;
    this.keyPassphrase = config.keyPassphrase;
    this.keystore = config.keystore;
    this.cipherSuites = config.cipherSuites;
    this.supportedProtocols = config.supportedProtocols;
  }
}
