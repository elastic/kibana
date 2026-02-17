/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getZodTypeName } from './get_zod_type_name';
import {
  getCompactTypeDescription,
  getDetailedTypeDescription,
  getJsonSchemaDescription,
  getTypeScriptLikeDescription,
} from './zod_type_description';

describe('zod_type_description', () => {
  describe('getDetailedTypeDescription', () => {
    describe('simple objects', () => {
      it('should describe a simple object with required fields', () => {
        const schema = z.object({
          id: z.string(),
          name: z.string(),
          age: z.number(),
        });

        const result = getDetailedTypeDescription(schema);
        expect(result).toBe('{\n  id: string;\n  name: string;\n  age: number\n}');
      });

      it('should describe an object with optional fields', () => {
        const schema = z.object({
          id: z.string(),
          name: z.string().optional(),
          age: z.number().optional(),
        });

        const result = getDetailedTypeDescription(schema);
        expect(result).toBe('{\n  id: string;\n  name?: string;\n  age?: number\n}');
      });

      it('should describe an object with mixed required and optional fields', () => {
        const schema = z.object({
          id: z.string(),
          name: z.string().optional(),
          isActive: z.boolean(),
          metadata: z.any().optional(),
        });

        const result = getDetailedTypeDescription(schema);
        expect(result).toBe(
          '{\n  id: string;\n  name?: string;\n  isActive: boolean;\n  metadata?: any\n}'
        );
      });

      it('should handle empty objects', () => {
        const schema = z.object({});
        const result = getDetailedTypeDescription(schema);
        expect(result).toBe('{}');
      });
    });

    describe('nested objects', () => {
      it('should describe nested objects', () => {
        const schema = z.object({
          user: z.object({
            id: z.string(),
            profile: z.object({
              firstName: z.string(),
              lastName: z.string(),
              age: z.number().optional(),
            }),
          }),
          settings: z.object({
            theme: z.string(),
            notifications: z.boolean(),
          }),
        });

        const result = getDetailedTypeDescription(schema);
        const expected = `{
  user: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      age?: number
    }
  };
  settings: {
    theme: string;
    notifications: boolean
  }
}`.trim();
        expect(result).toBe(expected);
      });

      it('should respect maxDepth option', () => {
        const schema = z.object({
          level1: z.object({
            level2: z.object({
              level3: z.object({
                deep: z.string(),
              }),
            }),
          }),
        });

        const result = getDetailedTypeDescription(schema, { maxDepth: 2 });
        expect(result).toBe(
          `{
  level1: {
    level2: object
  }
}`.trim()
        );
      });
    });

    describe('objects with arrays', () => {
      it('should describe objects with array fields', () => {
        const schema = z.object({
          id: z.string(),
          tags: z.array(z.string()),
          scores: z.array(z.number()),
        });

        const result = getDetailedTypeDescription(schema);
        expect(result).toBe('{\n  id: string;\n  tags: string[];\n  scores: number[]\n}');
      });

      it('should describe objects with nested object arrays', () => {
        const schema = z.object({
          users: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              active: z.boolean().optional(),
            })
          ),
        });

        const result = getDetailedTypeDescription(schema);
        const expected = `{
  users: {
    id: string;
    name: string;
    active?: boolean
  }[]
}`;
        expect(result).toBe(expected);
      });
    });

    describe('objects with unions', () => {
      it('should describe objects with union fields', () => {
        const schema = z.object({
          id: z.string(),
          value: z.union([z.string(), z.number()]),
          status: z.union([z.literal('active'), z.literal('inactive'), z.literal('pending')]),
        });

        const result = getDetailedTypeDescription(schema);
        expect(result).toBe(
          '{\n  id: string;\n  value: (string | number);\n  status: ("active" | "inactive" | "pending")\n}'
        );
      });

      it('should describe objects with complex union types', () => {
        const schema = z.object({
          data: z.union([
            z.object({ type: z.literal('user'), userId: z.string() }),
            z.object({ type: z.literal('group'), groupId: z.string(), memberCount: z.number() }),
          ]),
        });

        const result = getDetailedTypeDescription(schema);
        const expected = `{
  data: ({
    type: "user";
    userId: string
  } | {
    type: "group";
    groupId: string;
    memberCount: number
  })
}`;
        expect(result).toBe(expected);
      });
    });

    describe('objects with enums and literals', () => {
      it('should describe objects with enum fields', () => {
        const schema = z.object({
          status: z.enum(['draft', 'published', 'archived']),
          priority: z.enum(['low', 'medium', 'high']),
        });

        const result = getDetailedTypeDescription(schema);
        expect(result).toBe(
          '{\n  status: "draft" | "published" | "archived";\n  priority: "low" | "medium" | "high"\n}'
        );
      });

      it('should describe objects with literal fields', () => {
        const schema = z.object({
          type: z.literal('workflow'),
          version: z.literal(1),
          enabled: z.literal(true),
        });

        const result = getDetailedTypeDescription(schema);
        expect(result).toBe('{\n  type: "workflow";\n  version: 1;\n  enabled: true\n}');
      });
    });

    describe('discriminated unions', () => {
      it('should describe objects with discriminated unions', () => {
        const schema = z.object({
          item: z.discriminatedUnion('type', [
            z.object({ type: z.literal('text'), content: z.string() }),
            z.object({ type: z.literal('image'), url: z.string(), alt: z.string().optional() }),
          ]),
        });

        const result = getDetailedTypeDescription(schema);
        const expected = `{
  item: ({
    type: "text";
    content: string
  } | {
    type: "image";
    url: string;
    alt?: string
  })
}`;
        expect(result).toBe(expected);
      });
    });

    describe('options configuration', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string().optional(),
        metadata: z.object({
          created: z.date(),
          tags: z.array(z.string()),
        }),
      });

      it('should respect showOptional: false', () => {
        const result = getDetailedTypeDescription(schema, { showOptional: false });
        expect(result).toContain('name: string');
        expect(result).not.toContain('name?:');
      });

      it('should respect detailed: false', () => {
        const result = getDetailedTypeDescription(schema, { detailed: false });
        expect(result).toBe('object');
      });

      it('should include descriptions when available', () => {
        const schemaWithDesc = z.object({
          id: z.string().describe('Unique identifier'),
          name: z.string().describe('Display name'),
        });

        const result = getDetailedTypeDescription(schemaWithDesc, { includeDescriptions: true });
        expect(result).toContain('// Unique identifier');
        expect(result).toContain('// Display name');
      });

      it('should exclude descriptions when includeDescriptions: false', () => {
        const schemaWithDesc = z.object({
          id: z.string().describe('Unique identifier'),
          name: z.string().describe('Display name'),
        });

        const result = getDetailedTypeDescription(schemaWithDesc, { includeDescriptions: false });
        expect(result).not.toContain('//');
      });
    });
  });

  describe('getTypeScriptLikeDescription', () => {
    it('should generate TypeScript-like descriptions for objects', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string().optional(),
        settings: z.object({
          theme: z.string(),
          darkMode: z.boolean(),
        }),
      });

      const result = getTypeScriptLikeDescription(schema);
      const expected = `{
  id: string;
  name?: string;
  settings: {
    theme: string;
    darkMode: boolean
  }
}`;
      expect(result).toBe(expected);
    });

    it('should handle complex nested structures', () => {
      const schema = z.object({
        workflow: z.object({
          steps: z.array(
            z.object({
              id: z.string(),
              type: z.enum(['action', 'condition']),
              config: z.record(z.string(), z.any()),
            })
          ),
        }),
      });

      const result = getTypeScriptLikeDescription(schema);
      expect(result).toContain('steps: {');
      expect(result).toContain('type: "action" | "condition"');
      expect(result).toContain('config: record<string, any>');
    });
  });

  describe('getCompactTypeDescription', () => {
    it('should return compact descriptions for objects', () => {
      const schema = z.object({
        id: z.string(),
        nested: z.object({
          deep: z.string(),
        }),
      });

      const result = getCompactTypeDescription(schema);
      expect(result).toBe('object');
    });

    it('should return compact descriptions for complex types', () => {
      const complexSchema = z.union([z.object({ type: z.literal('a') }), z.array(z.string())]);

      const result = getCompactTypeDescription(complexSchema);
      expect(result).toBe('(object | string[])');
    });
  });

  describe('getJsonSchemaDescription', () => {
    it('should convert object schema to JSON Schema', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string().optional(),
        age: z.number(),
      });

      const result = getJsonSchemaDescription(schema);
      expect(result).toHaveProperty('type', 'object');
      expect(result).toHaveProperty('properties');
      expect(result).toHaveProperty('required');

      const properties = (result as any).properties;
      expect(properties).toHaveProperty('id', { type: 'string' });
      expect(properties).toHaveProperty('name', { type: 'string' });
      expect(properties).toHaveProperty('age', { type: 'number' });

      const required = (result as any).required;
      expect(required).toContain('id');
      expect(required).toContain('age');
      expect(required).not.toContain('name');
    });

    it('should handle nested objects in JSON Schema', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
          }),
        }),
      });

      const result = getJsonSchemaDescription(schema);
      const properties = (result as any).properties;
      expect(properties.user).toHaveProperty('type', 'object');
      expect(properties.user.properties.profile).toHaveProperty('type', 'object');
      expect(properties.user.properties.profile.properties.name).toHaveProperty('type', 'string');
    });
  });

  describe('edge cases', () => {
    it('should handle objects with all primitive types', () => {
      const schema = z.object({
        str: z.string(),
        num: z.number(),
        bool: z.boolean(),
        date: z.date(),
        any: z.any(),
        unknown: z.unknown(),
        nullValue: z.null(),
        undefinedValue: z.undefined(),
      });

      const result = getDetailedTypeDescription(schema);
      expect(result).toContain('str: string');
      expect(result).toContain('num: number');
      expect(result).toContain('bool: boolean');
      expect(result).toContain('date: date');
      expect(result).toContain('any: any');
      expect(result).toContain('unknown: unknown');
      expect(result).toContain('nullValue: null');
      expect(result).toContain('undefinedValue: undefined');
    });

    it('should handle deeply nested optional objects', () => {
      const schema = z.object({
        level1: z
          .object({
            level2: z
              .object({
                level3: z
                  .object({
                    value: z.string(),
                  })
                  .optional(),
              })
              .optional(),
          })
          .optional(),
      });

      const result = getDetailedTypeDescription(schema);
      expect(result).toContain('level1?: {');
      expect(result).toContain('level2?: {');
      expect(result).toContain('level3?: {');
    });

    it('should handle objects with record types', () => {
      const schema = z.object({
        metadata: z.record(z.string(), z.any()),
        config: z.record(z.string(), z.any()),
      });

      const result = getDetailedTypeDescription(schema);
      // Record types should be handled gracefully, even if not explicitly supported
      expect(result).toContain('metadata:');
      expect(result).toContain('config:');
    });
  });

  describe('ZodDefault handling', () => {
    it('should handle ZodDefault with string schema', () => {
      const schema = z.string().default('default value');
      const result = getDetailedTypeDescription(schema);
      expect(result).toBe('string');
    });

    it('should handle ZodDefault with array schema', () => {
      const schema = z.array(z.string()).default(['monday', 'tuesday']);
      const result = getDetailedTypeDescription(schema);
      expect(result).toBe('string[]');
    });

    it('should handle ZodDefault with object schema', () => {
      const schema = z
        .object({
          name: z.string(),
          age: z.number(),
        })
        .default({ name: 'John', age: 30 });
      const result = getDetailedTypeDescription(schema);
      expect(result).toBe('{\n  name: string;\n  age: number\n}');
    });

    it('should handle nested ZodDefault with ZodOptional', () => {
      const schema = z.string().optional().default('default value');
      const result = getDetailedTypeDescription(schema);
      expect(result).toBe('string?');
    });

    it('should handle ZodDefault with union schema', () => {
      const schema = z.union([z.string(), z.number()]).default('default');
      const result = getDetailedTypeDescription(schema);
      expect(result).toBe('(string | number)');
    });

    it('should handle ZodDefault with array of objects', () => {
      const schema = z
        .array(
          z.object({
            id: z.string(),
            value: z.number(),
          })
        )
        .default([{ id: '1', value: 10 }]);
      const result = getDetailedTypeDescription(schema);
      expect(result).toBe(
        `{
  id: string;
  value: number
}[]`.trim()
      );
    });
  });

  describe('Union array types', () => {
    it('should show union of array types', () => {
      const schema = z.union([z.array(z.string()), z.array(z.number()), z.array(z.boolean())]);
      const result = getDetailedTypeDescription(schema);
      expect(result).toBe('(string[] | number[] | boolean[])');
    });

    it('should show union of array types with constraints', () => {
      const schema = z.union([
        z.array(z.string()).min(1).max(5),
        z.array(z.number()).min(1).max(5),
        z.array(z.boolean()).min(1).max(5),
      ]);
      const result = getDetailedTypeDescription(schema);
      expect(result).toBe('(string[] | number[] | boolean[])');
    });
  });

  describe('Union array type detection', () => {
    it('should unwrap union of arrays as array type', () => {
      const schema = z.union([z.array(z.string()), z.array(z.number()), z.array(z.boolean())]);
      const result = getZodTypeName(schema);
      expect(result).toBe('(string[] | number[] | boolean[])');
    });

    it('should detect mixed union as union type', () => {
      const schema = z.union([z.string(), z.number(), z.boolean()]);
      const result = getZodTypeName(schema);
      expect(result).toBe('(string | number | boolean)');
    });
  });
});
