/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Config } from './config';

describe('Config', () => {
  it('recognizes keys under `object().pattern`', () => {
    const config = new Config({
      settings: {
        services: {
          foo: () => 42,
        },
        servers: {
          elasticsearch: {
            port: 1234,
          },
        },
      },
      primary: true,
      path: process.cwd(),
    });

    expect(config.has('services.foo')).toEqual(true);
    expect(config.get('services.foo')()).toEqual(42);
  });
});
