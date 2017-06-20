import * as crypto from 'crypto';
import { has } from 'lodash';

import { Schema, typeOfSchema } from '../../types';

const createSslSchema = (schema: Schema) => {
  const { object, boolean, string, arrayOf, oneOf, literal, maybe } = schema;

  return object({
    enabled: boolean({
      defaultValue: false
    }),
    certificate: maybe(string()),
    key: maybe(string()),
    keyPassphrase: maybe(string()),
    certificateAuthorities: maybe(arrayOf(string())),
    supportedProtocols: maybe(
      arrayOf(
        oneOf([
          literal('TLSv1'),
          literal('TLSv1.1'),
          literal('TLSv1.2')
        ])
      )
    ),
    cipherSuites: arrayOf(string(), {
      // $ExpextError: 'constants' is currently missing in built-in types
      defaultValue: crypto.constants.defaultCoreCipherList.split(':')
    })
  },
  {
    validate: ssl => {
      if (ssl.enabled && (!has(ssl, 'certificate') || !has(ssl, 'key'))) {
        return 'must specify [certificate] and [key] when ssl is enabled';
      }
    }
  })
}

const sslConfigType = typeOfSchema(createSslSchema);

export class SslConfig {
  static createSchema = createSslSchema;

  enabled: boolean;

  constructor(config: typeof sslConfigType) {
    this.enabled = config.enabled;
  }
}