import crypto from 'crypto';
import { schema, TypeOf } from '../config/schema';

const {
  object,
  boolean,
  string,
  arrayOf,
  oneOf,
  literal,
  maybe,
  number,
} = schema;

// `crypto` type definitions doesn't currently include `crypto.constants`, see
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/fa5baf1733f49cf26228a4e509914572c1b74adf/types/node/v6/index.d.ts#L3412
const cryptoConstants = (crypto as any).constants;

const protocolMap = new Map<string, number>([
  ['TLSv1', cryptoConstants.SSL_OP_NO_TLSv1],
  ['TLSv1.1', cryptoConstants.SSL_OP_NO_TLSv1_1],
  ['TLSv1.2', cryptoConstants.SSL_OP_NO_TLSv1_2],
]);

const sslSchema = object(
  {
    enabled: boolean({
      defaultValue: false,
    }),
    redirectHttpFromPort: maybe(number()),
    certificate: maybe(string()),
    key: maybe(string()),
    keyPassphrase: maybe(string()),
    certificateAuthorities: maybe(oneOf([arrayOf(string()), string()])),
    supportedProtocols: maybe(
      arrayOf(oneOf([literal('TLSv1'), literal('TLSv1.1'), literal('TLSv1.2')]))
    ),
    cipherSuites: arrayOf(string(), {
      defaultValue: cryptoConstants.defaultCoreCipherList.split(':'),
    }),
  },
  {
    validate: ssl => {
      if (ssl.enabled && (!ssl.key || !ssl.certificate)) {
        return 'must specify [certificate] and [key] when ssl is enabled';
      }
    },
  }
);

type SslConfigType = TypeOf<typeof sslSchema>;

export class SslConfig {
  /**
   * @internal
   */
  static schema = sslSchema;

  enabled: boolean;
  redirectHttpFromPort: number | undefined;
  key: string | undefined;
  certificate: string | undefined;
  certificateAuthorities: string[] | undefined;
  keyPassphrase: string | undefined;

  cipherSuites: string[];
  supportedProtocols: string[] | undefined;

  /**
   * @internal
   */
  constructor(config: SslConfigType) {
    this.enabled = config.enabled;
    this.redirectHttpFromPort = config.redirectHttpFromPort;
    this.key = config.key;
    this.certificate = config.certificate;
    this.certificateAuthorities = this.initCertificateAuthorities(
      config.certificateAuthorities
    );
    this.keyPassphrase = config.keyPassphrase;
    this.cipherSuites = config.cipherSuites;
    this.supportedProtocols = config.supportedProtocols;
  }

  /**
   * Options that affect the OpenSSL protocol behavior via numeric bitmask of the SSL_OP_* options from OpenSSL Options.
   */
  getSecureOptions() {
    if (
      this.supportedProtocols === undefined ||
      this.supportedProtocols.length === 0
    ) {
      return 0;
    }

    const supportedProtocols = this.supportedProtocols;
    return Array.from(protocolMap).reduce(
      (secureOptions, [protocolAlias, secureOption]) => {
        // `secureOption` is the option that turns *off* support for a particular protocol,
        // so if protocol is supported, we should not enable this option.
        return supportedProtocols.includes(protocolAlias)
          ? secureOptions
          : secureOptions | secureOption;
      },
      0
    );
  }

  private initCertificateAuthorities(
    certificateAuthorities?: string[] | string
  ) {
    if (
      certificateAuthorities === undefined ||
      Array.isArray(certificateAuthorities)
    ) {
      return certificateAuthorities;
    }

    return [certificateAuthorities];
  }
}
