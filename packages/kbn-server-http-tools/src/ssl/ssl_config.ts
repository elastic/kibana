/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { readPkcs12Keystore, readPkcs12Truststore } from '@kbn/crypto';
import { constants as cryptoConstants } from 'crypto';
import { readFileSync } from 'fs';
import { TLS_V1, TLS_V1_1, TLS_V1_2, TLS_V1_3 } from './constants';

const protocolMap = new Map<string, number>([
  [TLS_V1, cryptoConstants.SSL_OP_NO_TLSv1],
  [TLS_V1_1, cryptoConstants.SSL_OP_NO_TLSv1_1],
  [TLS_V1_2, cryptoConstants.SSL_OP_NO_TLSv1_2],
  // @ts-expect-error According to the docs SSL_OP_NO_TLSv1_3 should exist (https://nodejs.org/docs/latest-v12.x/api/crypto.html)
  [TLS_V1_3, cryptoConstants.SSL_OP_NO_TLSv1_3],
]);

export const sslSchema = schema.object(
  {
    certificate: schema.maybe(schema.string()),
    certificateAuthorities: schema.maybe(
      schema.oneOf([schema.arrayOf(schema.string()), schema.string()])
    ),
    cipherSuites: schema.arrayOf(schema.string(), {
      defaultValue: cryptoConstants.defaultCoreCipherList.split(':'),
    }),
    enabled: schema.boolean({
      defaultValue: false,
    }),
    key: schema.maybe(schema.string()),
    keyPassphrase: schema.maybe(schema.string()),
    keystore: schema.object({
      path: schema.maybe(schema.string()),
      password: schema.maybe(schema.string()),
    }),
    truststore: schema.object({
      path: schema.maybe(schema.string()),
      password: schema.maybe(schema.string()),
    }),
    redirectHttpFromPort: schema.maybe(schema.number()),
    supportedProtocols: schema.arrayOf(
      schema.oneOf([
        schema.literal(TLS_V1),
        schema.literal(TLS_V1_1),
        schema.literal(TLS_V1_2),
        schema.literal(TLS_V1_3),
      ]),
      { defaultValue: [TLS_V1_1, TLS_V1_2, TLS_V1_3], minSize: 1 }
    ),
    clientAuthentication: schema.oneOf(
      [schema.literal('none'), schema.literal('optional'), schema.literal('required')],
      { defaultValue: 'none' }
    ),
  },
  {
    validate: (ssl) => {
      if (ssl.key && ssl.keystore.path) {
        return 'cannot use [key] when [keystore.path] is specified';
      }

      if (ssl.certificate && ssl.keystore.path) {
        return 'cannot use [certificate] when [keystore.path] is specified';
      }

      if (ssl.enabled && (!ssl.key || !ssl.certificate) && !ssl.keystore.path) {
        return 'must specify [certificate] and [key] -- or [keystore.path] -- when ssl is enabled';
      }

      if (!ssl.enabled && ssl.clientAuthentication !== 'none') {
        return 'must enable ssl to use [clientAuthentication]';
      }
    },
  }
);

type SslConfigType = TypeOf<typeof sslSchema>;

export class SslConfig {
  public enabled: boolean;
  public redirectHttpFromPort?: number;
  public key?: string;
  public certificate?: string;
  public certificateAuthorities?: string[];
  public keyPassphrase?: string;
  public requestCert: boolean;
  public rejectUnauthorized: boolean;
  public cipherSuites: string[];
  public supportedProtocols: string[];

  /**
   * @internal
   */
  constructor(config: SslConfigType) {
    this.enabled = config.enabled;
    this.redirectHttpFromPort = config.redirectHttpFromPort;
    this.cipherSuites = config.cipherSuites;
    this.supportedProtocols = config.supportedProtocols;
    this.requestCert = config.clientAuthentication !== 'none';
    this.rejectUnauthorized = config.clientAuthentication === 'required';

    const addCAs = (ca: string[] | undefined) => {
      if (ca && ca.length) {
        this.certificateAuthorities = [...(this.certificateAuthorities || []), ...ca];
      }
    };

    if (config.keystore?.path) {
      const { key, cert, ca } = readPkcs12Keystore(config.keystore.path, config.keystore.password);
      if (!key) {
        throw new Error(`Did not find private key in keystore at [keystore.path].`);
      } else if (!cert) {
        throw new Error(`Did not find certificate in keystore at [keystore.path].`);
      }
      this.key = key;
      this.certificate = cert;
      addCAs(ca);
    } else if (config.key && config.certificate) {
      this.key = readFile(config.key);
      this.keyPassphrase = config.keyPassphrase;
      this.certificate = readFile(config.certificate);
    }

    if (config.truststore?.path) {
      const ca = readPkcs12Truststore(config.truststore.path, config.truststore.password);
      addCAs(ca);
    }

    const ca = config.certificateAuthorities;
    if (ca) {
      const parsed: string[] = [];
      const paths = Array.isArray(ca) ? ca : [ca];
      if (paths.length > 0) {
        for (const path of paths) {
          parsed.push(readFile(path));
        }
        addCAs(parsed);
      }
    }
  }

  /**
   * Options that affect the OpenSSL protocol behavior via numeric bitmask of the SSL_OP_* options from OpenSSL Options.
   */
  public getSecureOptions() {
    // our validation should ensure that this.supportedProtocols is at least an empty array,
    // which the following logic depends upon.
    if (this.supportedProtocols == null || this.supportedProtocols.length === 0) {
      throw new Error(`supportedProtocols should be specified`);
    }

    const supportedProtocols = this.supportedProtocols;
    return Array.from(protocolMap).reduce((secureOptions, [protocolAlias, secureOption]) => {
      // `secureOption` is the option that turns *off* support for a particular protocol,
      // so if protocol is supported, we should not enable this option.
      return supportedProtocols.includes(protocolAlias)
        ? secureOptions
        : secureOptions | secureOption; // eslint-disable-line no-bitwise
    }, 0);
  }

  public isEqualTo(otherConfig: SslConfig) {
    if (this === otherConfig) {
      return true;
    }
    return isEqual(this, otherConfig);
  }
}

const readFile = (file: string) => readFileSync(file, 'utf8');
