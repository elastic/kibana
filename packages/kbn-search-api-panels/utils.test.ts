/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { consoleDefinition } from './languages/console';
import { getConsoleRequest } from './utils';

describe('utils', () => {
  describe('getConsoleRequest()', () => {
    test('accepts string values', () => {
      const consoleRequest = getConsoleRequest('ingestData');
      expect(consoleRequest).toEqual(consoleDefinition.ingestData);
    });

    test('accepts function values', () => {
      const consoleRequest = getConsoleRequest('ingestDataIndex', {
        url: 'https://your_deployment_url',
        apiKey: 'yourApiKey',
        indexName: 'test-index',
      });
      expect(consoleRequest).toContain(`POST _bulk?pretty
{ \"index\" : { \"_index\" : \"test-index\" } }
{\"name\": \"foo\", \"title\": \"bar\"}`);
    });

    test('returns undefined if language definition is undefined', () => {
      // @ts-ignore TS should not allow an invalid language definition
      // We add @ts-ignore here to test the safeguard
      const consoleRequest = getConsoleRequest('nonExistentRequest');
      expect(consoleRequest).toEqual(undefined);
    });
  });
});
