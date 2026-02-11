/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as parseYaml } from 'yaml';

import { dataMapStepDefinition } from './data_map_step';
import type { StepHandlerContext } from '../../step_registry/types';

const createMockContext = (
  config: { items: unknown },
  input: { fields?: Record<string, unknown>; transform?: { pick?: unknown } }
): StepHandlerContext<any, any> => ({
  config,
  input,
  rawInput: input,
  contextManager: {
    renderInputTemplate: jest.fn((templateInput, additionalContext) => {
      if (Array.isArray(templateInput)) {
        return templateInput;
      }
      if (typeof templateInput === 'object' && templateInput !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(templateInput)) {
          if (typeof value === 'string' && value.includes('{{')) {
            if (value === '{{ item }}') {
              result[key] = additionalContext?.item;
            } else if (value.includes('item.')) {
              const match = value.match(/\{\{\s*item\.([\w.]+)\s*\}\}/);
              if (match && additionalContext?.item) {
                const path = match[1].split('.');
                let currentValue: any = additionalContext.item;
                for (const prop of path) {
                  if (currentValue && typeof currentValue === 'object' && prop in currentValue) {
                    currentValue = currentValue[prop];
                  } else {
                    currentValue = undefined;
                    break;
                  }
                }
                result[key] = currentValue;
              } else {
                result[key] = value;
              }
            } else if (value.includes('index')) {
              result[key] = additionalContext?.index;
            } else {
              result[key] = value;
            }
          } else {
            result[key] = value;
          }
        }
        return result as typeof templateInput;
      }
      return templateInput;
    }),
  } as any,
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'test-step',
  stepType: 'data.map',
});

describe('dataMapStepDefinition', () => {
  describe('handler', () => {
    it('should map array items with field projections', async () => {
      const config = {
        items: [
          { id: 1, name: 'Alice', age: 30 },
          { id: 2, name: 'Bob', age: 25 },
        ],
      };
      const input = {
        fields: {
          userId: '{{ item.id }}',
          userName: '{{ item.name }}',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        { userId: 1, userName: 'Alice' },
        { userId: 2, userName: 'Bob' },
      ]);
    });

    it('should provide index to template context', async () => {
      const config = {
        items: ['a', 'b', 'c'],
      };
      const input = {
        fields: {
          position: '{{ index }}',
          value: '{{ item }}',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        { position: 0, value: 'a' },
        { position: 1, value: 'b' },
        { position: 2, value: 'c' },
      ]);
    });

    it('should handle static field values', async () => {
      const config = {
        items: [{ id: 1 }, { id: 2 }],
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
          source: 'api',
          processed: true,
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        { id: 1, source: 'api', processed: true },
        { id: 2, source: 'api', processed: true },
      ]);
    });

    it('should handle empty array', async () => {
      const config = {
        items: [],
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([]);
      expect(context.logger.debug).toHaveBeenCalledWith(
        'Input array is empty, returning empty array'
      );
    });

    it('should handle object input and return mapped object', async () => {
      const config = {
        items: { id: 1, name: 'Alice' },
      };
      const input = {
        fields: {
          userId: '{{ item.id }}',
          userName: '{{ item.name }}',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual({ userId: 1, userName: 'Alice' });
      expect(context.logger.debug).toHaveBeenCalledWith('Mapping 1 item(s) with 2 fields');
    });

    it('should error when items is null', async () => {
      const config = {
        items: null,
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Items cannot be null or undefined');
    });

    it('should error when items is undefined', async () => {
      const config = {
        items: undefined,
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Items cannot be null or undefined');
    });

    it('should handle complex nested objects', async () => {
      const config = {
        items: [
          {
            user: { id: 1, profile: { name: 'Alice', email: 'alice@example.com' } },
            metadata: { created: '2024-01-01' },
          },
        ],
      };
      const input = {
        fields: {
          userId: '{{ item.user.id }}',
          name: '{{ item.user.profile.name }}',
          email: '{{ item.user.profile.email }}',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toHaveLength(1);
    });

    it('should log mapping progress', async () => {
      const config = {
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };
      const input = {
        fields: {
          userId: '{{ item.id }}',
        },
      };

      const context = createMockContext(config, input);
      await dataMapStepDefinition.handler(context);

      expect(context.logger.debug).toHaveBeenCalledWith('Mapping 3 item(s) with 1 fields');
      expect(context.logger.debug).toHaveBeenCalledWith('Successfully mapped 3 item(s)');
    });

    it('should handle multiple field mappings', async () => {
      const config = {
        items: [{ firstName: 'John', lastName: 'Doe', age: 30, city: 'NYC' }],
      };
      const input = {
        fields: {
          name: '{{ item.firstName }}',
          surname: '{{ item.lastName }}',
          years: '{{ item.age }}',
          location: '{{ item.city }}',
          country: 'USA',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        { name: 'John', surname: 'Doe', years: 30, location: 'NYC', country: 'USA' },
      ]);
    });

    it('should handle arrays with different item structures', async () => {
      const config = {
        items: [
          { type: 'user', id: 1, name: 'Alice' },
          { type: 'admin', id: 2, name: 'Bob', role: 'superuser' },
        ],
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
          name: '{{ item.name }}',
          type: '{{ item.type }}',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toHaveLength(2);
    });

    it('should handle object with nested properties', async () => {
      const config = {
        items: {
          user: { id: 1, profile: { name: 'Alice', email: 'alice@example.com' } },
          metadata: { created: '2024-01-01' },
        },
      };
      const input = {
        fields: {
          userId: '{{ item.user.id }}',
          name: '{{ item.user.profile.name }}',
          email: '{{ item.user.profile.email }}',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual({
        userId: 1,
        name: 'Alice',
        email: 'alice@example.com',
      });
    });

    it('should handle object with static field values', async () => {
      const config = {
        items: { id: 1, name: 'Product' },
      };
      const input = {
        fields: {
          productId: '{{ item.id }}',
          productName: '{{ item.name }}',
          source: 'api',
          processed: true,
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual({
        productId: 1,
        productName: 'Product',
        source: 'api',
        processed: true,
      });
    });

    it('should error when items is a primitive string', async () => {
      const config = {
        items: 'not an object or array',
      };
      const input = {
        fields: {
          value: '{{ item }}',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Expected items to be an array or object');
    });

    it('should error when items is a primitive number', async () => {
      const config = {
        items: 42,
      };
      const input = {
        fields: {
          value: '{{ item }}',
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Expected items to be an array or object');
    });

    it('should apply pick only (identity map then project) when fields is absent', async () => {
      const config = {
        items: [
          {
            id: 1,
            name: 'Item One',
            meta: { source: 'api', version: 2, internal: 'excluded' },
            extra: 'dropped',
          },
          {
            id: 2,
            name: 'Item Two',
            meta: { source: 'ui', version: 1 },
            extra: 'dropped',
          },
        ],
      };
      const input = {
        transform: {
          pick: parseYaml(`
          - id
          - name
          - meta.source
          - meta.version
        `),
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        { id: 1, name: 'Item One', meta: { source: 'api', version: 2 } },
        { id: 2, name: 'Item Two', meta: { source: 'ui', version: 1 } },
      ]);
    });

    it('should apply pick after mapping when both fields and pick are supplied', async () => {
      const config = {
        items: [
          { id: 1, name: 'Alice', age: 30, secret: 'x' },
          { id: 2, name: 'Bob', age: 25, secret: 'y' },
        ],
      };
      const input = {
        fields: {
          userId: '{{ item.id }}',
          userName: '{{ item.name }}',
          age: '{{ item.age }}',
        },
        transform: { pick: ['userId', 'userName'] },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        { userId: 1, userName: 'Alice' },
        { userId: 2, userName: 'Bob' },
      ]);
    });

    it('should support pick with nested list and dot paths (YAML format)', async () => {
      const config = {
        items: [
          {
            total_count: 42,
            items: [
              {
                comments: 3,
                created_at: '2024-01-01',
                assignees: { login: 'alice' },
                title: 'Bug',
                type: { name: 'issue' },
                url: 'https://example.com/1',
                labels: { name: 'bug' },
                updated_at: '2024-01-02',
                state: 'open',
                assignee: { login: 'bob' },
                repository_url: 'https://repo',
                user: { login: 'u1', html_url: '/u1', avatar_url: '/av1', internal: 'excluded' },
              },
            ],
          },
        ],
      };
      // Same structure as parseYaml of the YAML block (dot paths + nested list under items)
      const input = {
        transform: {
          pick: [
            'total_count',
            {
              items: [
                'comments',
                'created_at',
                'assignees.login',
                'title',
                'type.name',
                'url',
                'labels.name',
                'updated_at',
                'state',
                'assignee.login',
                'repository_url',
                { user: ['login', 'html_url', 'avatar_url'] },
              ],
            },
          ],
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          total_count: 42,
          items: [
            {
              comments: 3,
              created_at: '2024-01-01',
              assignees: { login: 'alice' },
              title: 'Bug',
              type: { name: 'issue' },
              url: 'https://example.com/1',
              labels: { name: 'bug' },
              updated_at: '2024-01-02',
              state: 'open',
              assignee: { login: 'bob' },
              repository_url: 'https://repo',
              user: { login: 'u1', html_url: '/u1', avatar_url: '/av1' },
            },
          ],
        },
      ]);
    });

    it('should support pick from YAML (parseYaml) with same shape as workflow', async () => {
      const config = {
        items: [{ id: 1, name: 'A', meta: { a: 1, b: 2 } }],
      };
      const input = {
        transform: {
          pick: parseYaml(`
          - id
          - name
          - meta.a
        `),
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([{ id: 1, name: 'A', meta: { a: 1 } }]);
    });
  });

  describe('schema validation', () => {
    it('should have correct step type ID', () => {
      expect(dataMapStepDefinition.id).toBe('data.map');
    });

    it('should validate config schema structure', () => {
      const validConfig = {
        items: [{ id: 1 }],
      };

      const parseResult = dataMapStepDefinition.configSchema!.safeParse(validConfig);
      expect(parseResult.success).toBe(true);
    });

    it('should validate input schema structure', () => {
      const validInput = {
        fields: { userId: '{{ item.id }}' },
      };

      const parseResult = dataMapStepDefinition.inputSchema.safeParse(validInput);
      expect(parseResult.success).toBe(true);
    });

    it('should validate input with only transform.pick', () => {
      const validInput = {
        transform: { pick: ['id', 'name', 'meta.source'] },
      };

      const parseResult = dataMapStepDefinition.inputSchema.safeParse(validInput);
      expect(parseResult.success).toBe(true);
    });

    it('should validate output schema as array', () => {
      const output = [
        { userId: 1, userName: 'Alice' },
        { userId: 2, userName: 'Bob' },
      ];

      const parseResult = dataMapStepDefinition.outputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);
    });

    it('should validate output schema as object', () => {
      const output = { userId: 1, userName: 'Alice' };

      const parseResult = dataMapStepDefinition.outputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);
    });
  });
});
