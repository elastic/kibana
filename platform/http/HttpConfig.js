// @flow

import crypto from 'crypto';
import { has } from 'lodash';

import { mb } from '../lib/ByteSizeValue';
import {
  object,
  maybe,
  string,
  number,
  boolean,
  arrayOf,
  byteSize,
  type TypeOf
} from '../lib/schema';

const hostnameRegex = /^(([A-Z0-9]|[A-Z0-9][A-Z0-9\-]*[A-Z0-9])\.)*([A-Z0-9]|[A-Z0-9][A-Z0-9\-]*[A-Z0-9])$/i;

const match = (regex: RegExp, errorMsg: string) =>
  (str: string) => regex.test(str) ? undefined : errorMsg;

export const schema = object({
  host: string({
    defaultValue: 'localhost',
    validate: match(hostnameRegex, 'must be a valid hostname')
  }),
  port: number({
    defaultValue: 5601
  }),
  maxPayload: byteSize({
    defaultValue: mb(1)
  }),
  autoListen: boolean({
    defaultValue: true
  }),
  defaultRoute: string({
    defaultValue: '/app/kibana',
    validate: val => /^\//.test(val) ? undefined : 'must start with a slash'
  }),
  basePath: string({
    defaultValue: '',
    validate: match(
      /(^$|^\/.*[^\/]$)/,
      'must start with a slash, don\'t end with one'
    )
  }),
  ssl: object(
    {
      enabled: boolean({
        defaultValue: false
      }),
      certificate: maybe(string()),
      key: maybe(string()),
      keyPassphrase: maybe(string()),
      certificateAuthorities: maybe(arrayOf(string())),
      supportedProtocols: maybe(
        arrayOf(
          string({
            valid: ['TLSv1', 'TLSv1.1', 'TLSv1.2']
          })
        )
      ),
      cipherSuites: arrayOf(string(), {
        // $FlowFixMe: 'constants' is currently missing in built-in types: https://github.com/facebook/flow/blob/master/lib/setting.js
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
  ),
  cors: object({
    enabled: boolean({
      defaultValue: false
    }),
    // karma test server
    origin: arrayOf(string(), {
      defaultValue: ['*://localhost:9876']
    })
  }),
  xsrf: object({
    disableProtection: boolean({
      defaultValue: false
    }),
    token: maybe(string()) // Deprecated
  })
});

export class HttpConfig {
  host: string;
  port: number;

  constructor(config: TypeOf<typeof schema>) {
    this.host = config.host;
    this.port = config.port;
  }
}
