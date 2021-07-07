/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { KibanaExecutionContext } from '../../types';
import {
  ExecutionContextContainer,
  BAGGAGE_MAX_PER_NAME_VALUE_PAIRS,
} from './execution_context_container';

describe('KibanaExecutionContext', () => {
  describe('toHeader', () => {
    it('returns an escaped string representation of provided execution context', () => {
      const context: KibanaExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'test-descripton',
      };

      const value = new ExecutionContextContainer(context).toHeader();
      expect(value).toMatchInlineSnapshot(`
        Object {
          "x-kbn-context": "%7B%22type%22%3A%22test-type%22%2C%22name%22%3A%22test-name%22%2C%22id%22%3A%2242%22%2C%22description%22%3A%22test-descripton%22%7D",
        }
      `);
    });

    it('trims a string representation of provided execution context if it is bigger max allowed size', () => {
      const context: KibanaExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'long long test-descripton,'.repeat(1000),
      };

      const value = new ExecutionContextContainer(context).toHeader();
      expect(value).toMatchInlineSnapshot(`
        Object {
          "x-kbn-context": "%7B%22type%22%3A%22test-type%22%2C%22name%22%3A%22test-name%22%2C%22id%22%3A%2242%22%2C%22description%22%3A%22long%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test-descripton%2Clong%20long%20test",
        }
      `);

      expect(new Blob(Object.values(value)).size).toBeLessThanOrEqual(
        BAGGAGE_MAX_PER_NAME_VALUE_PAIRS
      );
    });

    it('escapes the string representation of provided execution context', () => {
      const context: KibanaExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'описание',
      };

      const value = new ExecutionContextContainer(context).toHeader();
      expect(value).toMatchInlineSnapshot(`
        Object {
          "x-kbn-context": "%7B%22type%22%3A%22test-type%22%2C%22name%22%3A%22test-name%22%2C%22id%22%3A%2242%22%2C%22description%22%3A%22%D0%BE%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%B8%D0%B5%22%7D",
        }
      `);
    });
  });
});
