/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import crypto from 'crypto';
import { readFileSync } from 'fs';

// `crypto` type definitions doesn't currently include `crypto.constants`, see
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/fa5baf1733f49cf26228a4e509914572c1b74adf/types/node/v6/index.d.ts#L3412
const cryptoConstants = (crypto as any).constants;

const protocolMap = new Map<string, number>([
  ['TLSv1', cryptoConstants.SSL_OP_NO_TLSv1],
  ['TLSv1.1', cryptoConstants.SSL_OP_NO_TLSv1_1],
  ['TLSv1.2', cryptoConstants.SSL_OP_NO_TLSv1_2],
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
    redirectHttpFromPort: schema.maybe(schema.number()),
    supportedProtocols: schema.arrayOf(
      schema.oneOf([schema.literal('TLSv1'), schema.literal('TLSv1.1'), schema.literal('TLSv1.2')]),
      { defaultValue: ['TLSv1.1', 'TLSv1.2'], minSize: 1 }
    ),
    clientAuthentication: schema.oneOf(
      [schema.literal('none'), schema.literal('optional'), schema.literal('required')],
      { defaultValue: 'none' }
    ),
  },
  {
    validate: ssl => {
      if (ssl.enabled && (!ssl.key || !ssl.certificate)) {
        return 'must specify [certificate] and [key] when ssl is enabled';
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
  public redirectHttpFromPort: number | undefined;
  public key: string | undefined;
  public certificate: string | undefined;
  public certificateAuthorities: string[] | undefined;
  public keyPassphrase: string | undefined;
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

    if (config.key && config.certificate) {
      this.key = readFile(config.key);
      this.keyPassphrase = config.keyPassphrase;
      this.certificate = readFile(config.certificate);
    }

    const ca = config.certificateAuthorities;
    if (ca) {
      const parsed: string[] = [];
      const paths = Array.isArray(ca) ? ca : [ca];
      if (paths.length > 0) {
        for (const path of paths) {
          parsed.push(readFile(path));
        }
        this.certificateAuthorities = parsed;
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
}

const readFile = (file: string) => {
  return readFileSync(file, 'utf8');
};
