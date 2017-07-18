import * as crypto from 'crypto';
import { has } from 'lodash';

import {
  object,
  boolean,
  string,
  arrayOf,
  oneOf,
  literal,
  maybe,
  TypeOf
} from '../../lib/schema';

const sslSchema = object(
  {
    enabled: boolean({
      defaultValue: false
    }),
    certificate: maybe(string()),
    key: maybe(string()),
    keyPassphrase: maybe(string()),
    certificateAuthorities: maybe(arrayOf(string())),
    supportedProtocols: maybe(
      arrayOf(oneOf([literal('TLSv1'), literal('TLSv1.1'), literal('TLSv1.2')]))
    ),
    cipherSuites: arrayOf(string(), {
      defaultValue: crypto.constants.defaultCoreCipherList.split(':')
    })
  },
  {
    validate: ssl => {
      if (ssl.enabled && (!has(ssl, 'certificate') || !has(ssl, 'key'))) {
        return 'must specify [certificate] and [key] when ssl is enabled';
      }
    }
  }
);

export class SslConfig {
  static createSchema = () => sslSchema;

  enabled: boolean;

  constructor(config: TypeOf<typeof sslSchema>) {
    this.enabled = config.enabled;
  }
}
