/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as connectorsSpecs from './all_specs';
import type { ActionContext, ConnectorSpec } from './connector_spec';

const createFailingContext = (): ActionContext => {
  const rejection = new Error('connection failed');
  const reject = () => Promise.reject(rejection);

  return {
    client: {
      get: jest.fn(reject),
      post: jest.fn(reject),
      put: jest.fn(reject),
      patch: jest.fn(reject),
      delete: jest.fn(reject),
      request: jest.fn(reject),
    },
    config: {},
    log: {},
  } as unknown as ActionContext;
};

describe('opted-in connector test handlers', () => {
  const optedInSpecs = Object.entries(connectorsSpecs).filter(
    (entry): entry is [string, ConnectorSpec & { test: NonNullable<ConnectorSpec['test']> }] => {
      const [, spec] = entry;
      return spec.test?.enabled === true;
    }
  );

  it.each(optedInSpecs)('%s test handler must throw on failure', async (_exportName, spec) => {
    const handler = spec.test.handler;
    const ctx = createFailingContext();

    await expect(handler(ctx)).rejects.toThrow();
  });
});
