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
    // Provide minimal placeholder values so connectors that derive their URL from
    // config/secrets can reach the HTTP call rather than throwing on missing config.
    // Keys: baseUrl (Sublime Security), tokenUrl (Salesforce), accountUrl (Azure Blob),
    //       siteUrl (SharePoint Server), serverUrl (MCP-based: Box, Dropbox, GitHub, Monday),
    //       subdomain (Jira Cloud, Confluence Cloud).
    config: {
      baseUrl: 'https://placeholder.example.com',
      accountUrl: 'https://placeholder.example.com',
      siteUrl: 'https://placeholder.example.com',
      serverUrl: 'https://placeholder.example.com',
      subdomain: 'placeholder',
    },
    secrets: { tokenUrl: 'https://placeholder.example.com' },
    log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
};

describe('opted-in connector test handlers', () => {
  const optedInSpecs = Object.entries(connectorsSpecs).filter(
    (entry): entry is [string, ConnectorSpec] => {
      const [, spec] = entry;
      return spec.test.enabled === true;
    }
  );

  it('has at least one opted-in connector', () => {
    expect(optedInSpecs.length).toBeGreaterThan(0);
  });

  it.each(optedInSpecs)('%s test handler must throw on failure', async (_exportName, spec) => {
    const handler = spec.test.handler;
    const ctx = createFailingContext();

    await expect(handler(ctx)).rejects.toThrow();
  });
});
