/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataMapStepDefinition } from './data_map_step';
import type { StepHandlerContext } from '../../step_registry/types';

const createMockContext = (
  config: { items: unknown },
  input: { fields: Record<string, unknown> }
): StepHandlerContext<any, any> => ({
  config,
  input,
  rawInput: input,
  contextManager: {
    renderInputTemplate: jest.fn((templateInput, additionalContext) => {
      const resolveValue = (value: unknown, ctx: Record<string, unknown> | undefined): unknown => {
        if (value === null || value === undefined) return value;
        if (typeof value === 'string' && value.includes('{{')) {
          if (!ctx) return value;
          const match = value.match(/\{\{\s*(.+?)\s*\}\}/);
          if (!match) return value;
          const path = match[1].trim().split('.');
          let current: unknown = ctx[path[0]];
          for (let i = 1; i < path.length && current != null && typeof current === 'object'; i++) {
            current = (current as Record<string, unknown>)[path[i]];
          }
          return current;
        }
        if (Array.isArray(value)) {
          return value.map((entry) => resolveValue(entry, ctx));
        }
        if (typeof value === 'object') {
          const result: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(value)) {
            result[k] = resolveValue(v, ctx);
          }
          return result;
        }
        return value;
      };
      return resolveValue(templateInput, additionalContext) as typeof templateInput;
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
  });

  describe('$map recursive mapping', () => {
    it('should map nested array with $map directive', async () => {
      const config = {
        items: [
          {
            id: '1',
            name: 'Alice',
            tags: [
              { label: 'a', color: 'red' },
              { label: 'b', color: 'blue' },
            ],
          },
        ],
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
          name: '{{ item.name }}',
          tags: {
            $map: { items: '{{ item.tags }}', item: 'tag' },
            label: '{{ tag.label }}',
            color: '{{ tag.color }}',
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          id: '1',
          name: 'Alice',
          tags: [
            { label: 'a', color: 'red' },
            { label: 'b', color: 'blue' },
          ],
        },
      ]);
    });

    it('should keep parent scope accessible inside $map', async () => {
      const config = {
        items: [
          {
            id: '1',
            type: 'user',
            name: 'Alice',
            tags: [{ label: 'admin' }],
          },
        ],
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
          tags: {
            $map: { items: '{{ item.tags }}', item: 'tag' },
            label: '{{ tag.label }}',
            owner: '{{ item.name }}',
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          id: '1',
          tags: [{ label: 'admin', owner: 'Alice' }],
        },
      ]);
    });

    it('should support multi-level recursion', async () => {
      const config = {
        items: [
          {
            name: 'Org1',
            departments: [
              {
                name: 'Eng',
                employees: [{ name: 'Alice' }, { name: 'Bob' }],
              },
            ],
          },
        ],
      };
      const input = {
        fields: {
          org_name: '{{ item.name }}',
          departments: {
            $map: { items: '{{ item.departments }}', item: 'dept' },
            dept_name: '{{ dept.name }}',
            employees: {
              $map: { items: '{{ dept.employees }}', item: 'emp' },
              name: '{{ emp.name }}',
              department: '{{ dept.name }}',
              org: '{{ item.name }}',
            },
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          org_name: 'Org1',
          departments: [
            {
              dept_name: 'Eng',
              employees: [
                { name: 'Alice', department: 'Eng', org: 'Org1' },
                { name: 'Bob', department: 'Eng', org: 'Org1' },
              ],
            },
          ],
        },
      ]);
    });

    it('should support $map alongside literal nesting', async () => {
      const config = {
        items: [
          {
            id: '1',
            name: 'Alice',
            tags: [{ label: 'x' }],
            extra: 'ignored',
          },
        ],
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
          name: '{{ item.name }}',
          extra: {
            id: '{{ item.id }}',
            source: 'api',
          },
          tags: {
            $map: { items: '{{ item.tags }}', item: 'tag' },
            label: '{{ tag.label }}',
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          id: '1',
          name: 'Alice',
          extra: { id: '1', source: 'api' },
          tags: [{ label: 'x' }],
        },
      ]);
    });

    it('should support nested literal objects inside $map', async () => {
      const config = {
        items: [
          {
            id: '1',
            tags: [{ label: 'a', user: { id: 'u1' } }],
          },
        ],
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
          tags: {
            $map: { items: '{{ item.tags }}', item: 'tag' },
            label: '{{ tag.label }}',
            owner: {
              id: '{{ tag.user.id }}',
            },
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          id: '1',
          tags: [{ label: 'a', owner: { id: 'u1' } }],
        },
      ]);
    });

    it('should return empty array when $map items resolves to a non-array', async () => {
      const config = {
        items: [{ id: '1', meta: 'not an array' }],
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
          meta: {
            $map: { items: '{{ item.meta }}', item: 'm' },
            x: '{{ m.x }}',
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.error).toBeUndefined();
      expect(result.output).toEqual([{ id: '1', meta: [] }]);
    });

    it('should return empty array when $map items resolves to null', async () => {
      const config = {
        items: [{ id: '1', meta: null }],
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
          meta: {
            $map: { items: '{{ item.meta }}', item: 'm' },
            x: '{{ m.x }}',
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.error).toBeUndefined();
      expect(result.output).toEqual([{ id: '1', meta: [] }]);
    });

    it('should treat invalid $map value as literal nesting', async () => {
      const config = {
        items: [{ id: '1', tags: [{ label: 'a' }] }],
      };
      const input = {
        fields: {
          tags: {
            $map: 'invalid',
            label: '{{ tag.label }}',
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      // Invalid $map is ignored — treated as literal nesting (no $map directive found)
      expect(result.error).toBeUndefined();
      expect(result.output).toBeDefined();
    });

    it('should provide iteration index via custom index name', async () => {
      const config = {
        items: [
          {
            tags: [{ label: 'a' }, { label: 'b' }],
          },
        ],
      };
      const input = {
        fields: {
          tags: {
            $map: { items: '{{ item.tags }}', item: 'tag', index: 'tag_index' },
            label: '{{ tag.label }}',
            position: '{{ tag_index }}',
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          tags: [
            { label: 'a', position: 0 },
            { label: 'b', position: 1 },
          ],
        },
      ]);
    });

    it('should default item to "item" and index to "index" when omitted', async () => {
      const config = {
        items: [
          {
            tags: [{ label: 'a' }, { label: 'b' }],
          },
        ],
      };
      const input = {
        fields: {
          tags: {
            $map: { items: '{{ item.tags }}' },
            label: '{{ item.label }}',
            position: '{{ index }}',
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          tags: [
            { label: 'a', position: 0 },
            { label: 'b', position: 1 },
          ],
        },
      ]);
    });

    it('should default index to "index" when only item is provided', async () => {
      const config = {
        items: [
          {
            tags: [{ label: 'x' }, { label: 'y' }],
          },
        ],
      };
      const input = {
        fields: {
          tags: {
            $map: { items: '{{ item.tags }}', item: 'tag' },
            label: '{{ tag.label }}',
            position: '{{ index }}',
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          tags: [
            { label: 'x', position: 0 },
            { label: 'y', position: 1 },
          ],
        },
      ]);
    });

    it('should return empty array when depth limit exceeded', async () => {
      let dataLevel: unknown = [{}];
      for (let i = 0; i < 11; i++) {
        dataLevel = [{ level: dataLevel }];
      }
      const config = { items: { level: dataLevel } };

      // Build deeply nested fields bottom-up to avoid infinite recursion
      let deepFields: Record<string, unknown> = {
        $map: { items: '{{ l.level }}', item: 'l' },
        id: '{{ l.id }}',
      };
      for (let i = 0; i < 11; i++) {
        deepFields = {
          $map: { items: i === 10 ? '{{ item.level }}' : '{{ l.level }}', item: 'l' },
          level: deepFields,
        };
      }

      const input = { fields: { level: deepFields } };
      const context = createMockContext(config, input);
      const result: any = await dataMapStepDefinition.handler(context);

      expect(result.error).toBeUndefined();
      expect(result.output).toBeDefined();

      // Depth limit returns empty array instead of throwing
      let lastLevel = result.output.level;
      for (let i = 0; i < 9; i++) {
        lastLevel = lastLevel[0].level;
      }
      expect(lastLevel[0].level).toBeUndefined();
    });
  });

  describe('nested array → object → array → object', () => {
    it('should handle $map → literal object → $map → literal object', async () => {
      const config = {
        items: [
          {
            name: 'Store A',
            departments: [
              {
                name: 'Electronics',
                location: 'Floor 1',
                products: [
                  { sku: 'TV-01', brand: { name: 'Acme', country: 'US' } },
                  { sku: 'TV-02', brand: { name: 'Beta', country: 'DE' } },
                ],
              },
              {
                name: 'Books',
                location: 'Floor 2',
                products: [{ sku: 'BK-01', brand: { name: 'Pub', country: 'UK' } }],
              },
            ],
          },
        ],
      };
      const input = {
        fields: {
          store: '{{ item.name }}',
          departments: {
            $map: { items: '{{ item.departments }}', item: 'dept' },
            dept_name: '{{ dept.name }}',
            info: {
              location: '{{ dept.location }}',
              store: '{{ item.name }}',
            },
            products: {
              $map: { items: '{{ dept.products }}', item: 'prod' },
              sku: '{{ prod.sku }}',
              brand: {
                name: '{{ prod.brand.name }}',
                country: '{{ prod.brand.country }}',
              },
            },
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          store: 'Store A',
          departments: [
            {
              dept_name: 'Electronics',
              info: { location: 'Floor 1', store: 'Store A' },
              products: [
                { sku: 'TV-01', brand: { name: 'Acme', country: 'US' } },
                { sku: 'TV-02', brand: { name: 'Beta', country: 'DE' } },
              ],
            },
            {
              dept_name: 'Books',
              info: { location: 'Floor 2', store: 'Store A' },
              products: [{ sku: 'BK-01', brand: { name: 'Pub', country: 'UK' } }],
            },
          ],
        },
      ]);
    });

    it('should handle literal object containing a $map', async () => {
      const config = {
        items: [
          {
            id: '1',
            details: {
              tags: [{ label: 'a' }, { label: 'b' }],
              category: 'test',
            },
          },
        ],
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
          details: {
            category: '{{ item.details.category }}',
            tags: {
              $map: { items: '{{ item.details.tags }}', item: 'tag' },
              label: '{{ tag.label }}',
            },
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          id: '1',
          details: {
            category: 'test',
            tags: [{ label: 'a' }, { label: 'b' }],
          },
        },
      ]);
    });

    it('should handle 4-level nesting: $map → object → $map → object', async () => {
      const config = {
        items: [
          {
            regions: [
              {
                name: 'EU',
                offices: [
                  {
                    city: 'Berlin',
                    contact: { phone: '+49', email: 'berlin@co' },
                  },
                  {
                    city: 'Paris',
                    contact: { phone: '+33', email: 'paris@co' },
                  },
                ],
              },
            ],
          },
        ],
      };
      const input = {
        fields: {
          regions: {
            $map: { items: '{{ item.regions }}', item: 'region' },
            region_name: '{{ region.name }}',
            offices: {
              $map: { items: '{{ region.offices }}', item: 'office' },
              city: '{{ office.city }}',
              contact: {
                phone: '{{ office.contact.phone }}',
                email: '{{ office.contact.email }}',
              },
            },
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          regions: [
            {
              region_name: 'EU',
              offices: [
                {
                  city: 'Berlin',
                  contact: { phone: '+49', email: 'berlin@co' },
                },
                {
                  city: 'Paris',
                  contact: { phone: '+33', email: 'paris@co' },
                },
              ],
            },
          ],
        },
      ]);
    });

    it('should propagate all ancestor bindings through interleaved levels', async () => {
      const config = {
        items: [
          {
            org: 'Elastic',
            teams: [
              {
                name: 'Platform',
                members: [{ name: 'Alice' }, { name: 'Bob' }],
              },
            ],
          },
        ],
      };
      const input = {
        fields: {
          org: '{{ item.org }}',
          teams: {
            $map: { items: '{{ item.teams }}', item: 'team' },
            team_name: '{{ team.name }}',
            roster: {
              $map: { items: '{{ team.members }}', item: 'member' },
              name: '{{ member.name }}',
              team: '{{ team.name }}',
              org: '{{ item.org }}',
            },
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          org: 'Elastic',
          teams: [
            {
              team_name: 'Platform',
              roster: [
                { name: 'Alice', team: 'Platform', org: 'Elastic' },
                { name: 'Bob', team: 'Platform', org: 'Elastic' },
              ],
            },
          ],
        },
      ]);
    });

    it('should handle empty nested arrays gracefully', async () => {
      const config = {
        items: [
          {
            id: '1',
            departments: [
              { name: 'Eng', employees: [] },
              { name: 'Sales', employees: [{ name: 'Carol' }] },
            ],
          },
        ],
      };
      const input = {
        fields: {
          id: '{{ item.id }}',
          departments: {
            $map: { items: '{{ item.departments }}', item: 'dept' },
            name: '{{ dept.name }}',
            employees: {
              $map: { items: '{{ dept.employees }}', item: 'emp' },
              name: '{{ emp.name }}',
            },
          },
        },
      };

      const context = createMockContext(config, input);
      const result = await dataMapStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          id: '1',
          departments: [
            { name: 'Eng', employees: [] },
            { name: 'Sales', employees: [{ name: 'Carol' }] },
          ],
        },
      ]);
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

    it('should validate $map binding names when they are safe identifiers', () => {
      const validInput = {
        fields: {
          tags: {
            $map: { items: '{{ item.tags }}', item: 'tag_1', index: '_idx' },
            value: '{{ tag_1.value }}',
          },
        },
      };

      const parseResult = dataMapStepDefinition.inputSchema.safeParse(validInput);
      expect(parseResult.success).toBe(true);
    });

    it('should reject invalid $map.item binding names', () => {
      const invalidInput = {
        fields: {
          tags: {
            $map: { items: '{{ item.tags }}', item: 'tag-name' },
            value: '{{ item.value }}',
          },
        },
      };

      const parseResult = dataMapStepDefinition.inputSchema.safeParse(invalidInput);
      expect(parseResult.success).toBe(false);
    });

    it('should reject invalid $map.index binding names', () => {
      const invalidInput = {
        fields: {
          tags: {
            $map: { items: '{{ item.tags }}', index: '0index' },
            value: '{{ item.value }}',
          },
        },
      };

      const parseResult = dataMapStepDefinition.inputSchema.safeParse(invalidInput);
      expect(parseResult.success).toBe(false);
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
