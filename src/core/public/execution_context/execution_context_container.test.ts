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

    it('includes a child context to string representation', () => {
      const childContext: KibanaExecutionContext = {
        type: 'child-test-type',
        name: 'child-test-name',
        id: '42',
        description: 'child-test-descripton',
      };

      const context: KibanaExecutionContext = {
        type: 'type',
        name: 'name',
        id: '41',
        description: 'descripton',
        child: childContext,
      };

      const value = new ExecutionContextContainer(context).toHeader();
      expect(value).toMatchInlineSnapshot(`
        Object {
          "x-kbn-context": "%7B%22type%22%3A%22type%22%2C%22name%22%3A%22name%22%2C%22id%22%3A%2241%22%2C%22description%22%3A%22descripton%22%2C%22child%22%3A%7B%22type%22%3A%22child-test-type%22%2C%22name%22%3A%22child-test-name%22%2C%22id%22%3A%2242%22%2C%22description%22%3A%22child-test-descripton%22%7D%7D",
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
  describe('toJSON', () => {
    it('returns JSON representation of the context', () => {
      const context: KibanaExecutionContext = {
        type: 'test-type',
        name: 'test-name',
        id: '42',
        description: 'test-descripton',
      };

      const value = new ExecutionContextContainer(context).toJSON();
      expect(value).toEqual(context);
    });

    it('returns JSON representation when the parent context if provided', () => {
      const childBContext: KibanaExecutionContext = {
        type: 'child-b-type',
        name: 'child-b-name',
        id: '42',
        description: 'child-b-descripton',
      };

      const childAContext: KibanaExecutionContext = {
        type: 'child-a-type',
        name: 'child-a-name',
        id: '41',
        description: 'child-a-descripton',
        child: childBContext,
      };

      const context: KibanaExecutionContext = {
        type: 'type',
        name: 'name',
        id: '40',
        description: 'descripton',
        child: childAContext,
      };

      const value = new ExecutionContextContainer(context).toJSON();
      expect(value).toEqual({
        ...context,
        child: {
          ...childAContext,
          child: childBContext,
        },
      });
    });
  });
});
