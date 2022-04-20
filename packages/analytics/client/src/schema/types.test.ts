/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PossibleSchemaTypes, RootSchema, SchemaValue } from './types';

describe('schema types', () => {
  describe('PossibleSchemaTypes', () => {
    test('it should only allow "string" types', () => {
      let valueType: PossibleSchemaTypes<string> = 'keyword';
      valueType = 'text';
      valueType = 'date';

      // @ts-expect-error
      valueType = 'boolean';
      // @ts-expect-error
      valueType = 'long';
      // @ts-expect-error
      valueType = 'integer';
      // @ts-expect-error
      valueType = 'short';
      // @ts-expect-error
      valueType = 'byte';
      // @ts-expect-error
      valueType = 'double';
      // @ts-expect-error
      valueType = 'float';

      expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
    });
    test('it should only allow "number" types', () => {
      let valueType: PossibleSchemaTypes<number> = 'long';
      valueType = 'integer';
      valueType = 'short';
      valueType = 'byte';
      valueType = 'double';
      valueType = 'float';
      valueType = 'date';

      // @ts-expect-error
      valueType = 'boolean';
      // @ts-expect-error
      valueType = 'keyword';

      expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
    });
    test('it should only allow "boolean" types', () => {
      let valueType: PossibleSchemaTypes<boolean> = 'boolean';
      // @ts-expect-error
      valueType = 'integer';
      // @ts-expect-error
      valueType = 'short';
      // @ts-expect-error
      valueType = 'byte';
      // @ts-expect-error
      valueType = 'double';
      // @ts-expect-error
      valueType = 'float';
      // @ts-expect-error
      valueType = 'date';

      // @ts-expect-error
      valueType = 'keyword';

      expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
    });
  });

  describe('SchemaValue', () => {
    describe('Pass Through', () => {
      test('it should allow "pass_through" and enforce the _meta.description', () => {
        let valueType: SchemaValue<string> = {
          type: 'pass_through',
          _meta: {
            description: 'Some description',
          },
        };

        valueType = {
          type: 'pass_through',
          _meta: {
            description: 'Some description',
            optional: false,
          },
        };

        valueType = {
          type: 'pass_through',
          _meta: {
            description: 'Some description',
            // @ts-expect-error optional can't be true when the types don't set the value as optional
            optional: true,
          },
        };

        // @ts-expect-error because it's missing the _meta.description
        valueType = { type: 'pass_through' };
        expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
      });
      test('it should enforce `_meta.optional: true`', () => {
        let valueType: SchemaValue<string | undefined> = {
          type: 'pass_through',
          _meta: {
            description: 'Some description',
            optional: true,
          },
        };

        valueType = {
          type: 'pass_through',
          _meta: {
            description: 'Some description',
            // @ts-expect-error because optional can't be false when the value can be undefined
            optional: false,
          },
        };
        expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
      });
    });

    describe('Plain value', () => {
      test('it should allow the correct type and enforce the _meta.description', () => {
        let valueType: SchemaValue<string> = {
          type: 'keyword',
          _meta: {
            description: 'Some description',
          },
        };

        valueType = {
          type: 'keyword',
          _meta: {
            description: 'Some description',
            optional: false,
          },
        };

        valueType = {
          // @ts-expect-error because the type does not match
          type: 'long',
          _meta: {
            description: 'Some description',
            optional: false,
          },
        };

        valueType = {
          type: 'keyword',
          _meta: {
            description: 'Some description',
            // @ts-expect-error optional can't be true when the types don't set the value as optional
            optional: true,
          },
        };

        // @ts-expect-error because it's missing the _meta.description
        valueType = { type: 'keyword' };
        expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
      });
      test('it should enforce `_meta.optional: true`', () => {
        let valueType: SchemaValue<string | undefined> = {
          type: 'keyword',
          _meta: {
            description: 'Some description',
            optional: true,
          },
        };

        valueType = {
          type: 'keyword',
          _meta: {
            description: 'Some description',
            // @ts-expect-error because optional can't be false when the value can be undefined
            optional: false,
          },
        };
        expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
      });
    });

    describe('Object value', () => {
      test('it should allow "pass_through" and enforce the _meta.description', () => {
        let valueType: SchemaValue<{ a_value: string }> = {
          type: 'pass_through',
          _meta: {
            description: 'Some description',
          },
        };

        // @ts-expect-error because it's missing the _meta.description
        valueType = { type: 'pass_through' };
        expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
      });

      test('it should expect the proper object-schema definition, and allows some _meta at the object level as well', () => {
        let valueType: SchemaValue<{ a_value: string }> = {
          properties: {
            a_value: {
              type: 'keyword',
              _meta: {
                description: 'Some description',
              },
            },
          },
        };

        valueType = {
          properties: {
            a_value: {
              type: 'keyword',
              _meta: {
                description: 'Some description',
                optional: false,
              },
            },
          },
          _meta: {
            description: 'Description at the object level',
          },
        };

        valueType = {
          properties: {
            a_value: {
              type: 'keyword',
              _meta: {
                description: 'Some description',
                optional: false,
              },
            },
            // @ts-expect-error b_value does not exist in the object definition
            b_value: {
              type: 'keyword',
              _meta: {
                description: 'Some description',
                optional: true,
              },
            },
          },
          _meta: {
            description: 'Description at the object level',
          },
        };

        // @ts-expect-error because it's missing object properties
        valueType = { properties: {} };
        expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
      });

      test('it should enforce `_meta.optional: true`', () => {
        const objectValueType: SchemaValue<{ a_value: string } | undefined> = {
          properties: {
            a_value: {
              type: 'keyword',
              _meta: {
                description: 'Some description',
              },
            },
          },
          _meta: {
            description: 'Optional object',
            optional: true,
          },
        };
        expect(objectValueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain

        let valueType: SchemaValue<{ a_value?: string }> = {
          properties: {
            a_value: {
              type: 'keyword',
              _meta: {
                description: 'Some description',
                optional: true,
              },
            },
          },
        };

        valueType = {
          properties: {
            a_value: {
              type: 'keyword',
              // @ts-expect-error because it should provide optional: true
              _meta: {
                description: 'Some description',
              },
            },
          },
        };
        expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
      });
    });

    describe('Array value', () => {
      test('it should allow "pass_through" and enforce the _meta.description', () => {
        let valueType: SchemaValue<Array<{ a_value: string }>> = {
          type: 'pass_through',
          _meta: {
            description: 'Some description',
          },
        };

        // @ts-expect-error because it's missing the _meta.description
        valueType = { type: 'pass_through' };
        expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
      });

      test('it should expect the proper array-schema definition, and allows some _meta at the object level as well', () => {
        let valueType: SchemaValue<Array<{ a_value: string }>> = {
          type: 'array',
          items: {
            properties: {
              a_value: {
                type: 'keyword',
                _meta: {
                  description: 'Some description',
                },
              },
            },
          },
        };

        valueType = {
          type: 'array',
          items: {
            properties: {
              a_value: {
                type: 'keyword',
                _meta: {
                  description: 'Some description',
                  optional: false,
                },
              },
            },
            _meta: {
              description: 'Description at the object level',
            },
          },
        };

        // @ts-expect-error because it's missing the items definition
        valueType = { type: 'array' };
        // @ts-expect-error because it's missing the items definition
        valueType = { type: 'array', items: {} };
        // @ts-expect-error because it's missing the items' properties definition
        valueType = { type: 'array', items: { properties: {} } };
        expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
      });

      test('it should enforce `_meta.optional: true`', () => {
        const arrayValueType: SchemaValue<Array<{ a_value: string }> | undefined> = {
          type: 'array',
          items: {
            properties: {
              a_value: {
                type: 'keyword',
                _meta: {
                  description: 'Some description',
                },
              },
            },
          },
          _meta: {
            description: 'Optional object',
            optional: true,
          },
        };
        expect(arrayValueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain

        const objectValueType: SchemaValue<Array<{ a_value: string } | undefined>> = {
          type: 'array',
          items: {
            properties: {
              a_value: {
                type: 'keyword',
                _meta: {
                  description: 'Some description',
                },
              },
            },
            _meta: {
              description: 'Optional object',
              optional: true,
            },
          },
        };
        expect(objectValueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain

        let valueType: SchemaValue<Array<{ a_value?: string }>> = {
          type: 'array',
          items: {
            properties: {
              a_value: {
                type: 'keyword',
                _meta: {
                  description: 'Some description',
                  optional: true,
                },
              },
            },
          },
        };

        valueType = {
          type: 'array',
          items: {
            properties: {
              a_value: {
                type: 'keyword',
                // @ts-expect-error because it should provide optional: true
                _meta: {
                  description: 'Some description',
                },
              },
            },
          },
        };
        expect(valueType).not.toBeUndefined(); // <-- Only to stop the var-not-used complain
      });
    });
  });

  describe('RootSchema', () => {
    const registerSchema = <Base>(schema: RootSchema<Base>) => schema;
    test('it works with the explicit types', () => {
      registerSchema<{
        my_keyword: string;
        my_number?: number;
        my_complex_unknown_meta_object: Record<string, unknown>;
        my_array_of_str: string[];
        my_object: { my_timestamp: string };
        my_array_of_objects: Array<{ my_bool_prop: boolean }>;
      }>({
        my_keyword: {
          type: 'keyword',
          _meta: {
            description: 'Represents the key property...',
          },
        },
        my_number: {
          type: 'long',
          _meta: {
            description: 'Indicates the number of times...',
            optional: true,
          },
        },
        my_complex_unknown_meta_object: {
          type: 'pass_through',
          _meta: {
            description: 'Unknown object that contains the key-values...',
          },
        },
        my_array_of_str: {
          type: 'array',
          items: {
            type: 'text',
            _meta: {
              description: 'List of tags...',
            },
          },
        },
        my_object: {
          properties: {
            my_timestamp: {
              type: 'date',
              _meta: {
                description: 'timestamp when the user...',
              },
            },
          },
        },
        my_array_of_objects: {
          type: 'array',
          items: {
            properties: {
              my_bool_prop: {
                type: 'boolean',
                _meta: {
                  description: '`true` when...',
                },
              },
            },
          },
        },
      });
    });
    test('it works with implicit types', () => {
      registerSchema({});
      registerSchema({
        my_keyword: {
          type: 'keyword',
          _meta: {
            description: 'Represents the key property...',
          },
        },
        my_number: {
          type: 'long',
          _meta: {
            description: 'Indicates the number of times...',
            optional: true,
          },
        },
        my_complex_unknown_meta_object: {
          type: 'pass_through',
          _meta: {
            description: 'Unknown object that contains the key-values...',
          },
        },
        my_array_of_str: {
          type: 'array',
          items: {
            type: 'text',
            _meta: {
              description: 'List of tags...',
            },
          },
        },
        my_object: {
          properties: {
            my_timestamp: {
              type: 'date',
              _meta: {
                description: 'timestamp when the user...',
              },
            },
          },
        },
        my_array_of_objects: {
          type: 'array',
          items: {
            properties: {
              my_bool_prop: {
                type: 'boolean',
                _meta: {
                  description: '`true` when...',
                },
              },
            },
          },
        },
      });
    });
  });
});
