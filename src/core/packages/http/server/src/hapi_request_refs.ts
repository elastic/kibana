/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * `@hapi/hapi` 21.4.10 widened the default query, params, and headers refs to
 * `unknown` so applications can augment them. Kibana keeps hapi's default query
 * parser and does not coerce path params or headers, so restore the previous types.
 */
declare module '@hapi/hapi' {
  interface ReqRefDefaults {
    Query: {
      [key: string]: string | string[] | undefined;
    };
    Params: Record<string, string>;
    Headers: Record<string, string | string[] | undefined>;
  }
}

export {};
