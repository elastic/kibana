/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SpecificationTypes } from './types';
import { generateBodyParams as generateBodyParamsForAvailability } from './generate_body_params';
import { getMockProperty, mockRequestType, mockSchema } from './helpers/test_helpers';

const makeRequestWithBody = (
  properties: SpecificationTypes.Property[]
): SpecificationTypes.Request => ({
  ...mockRequestType,
  body: { kind: 'properties', properties },
});

const allEndpointEnvironments: SpecificationTypes.Availabilities = {
  stack: {},
  serverless: {},
};

const generateBodyParams = (
  requestType: SpecificationTypes.Request,
  schema: SpecificationTypes.Model,
  endpointAvailability: SpecificationTypes.Availabilities = allEndpointEnvironments
) => generateBodyParamsForAvailability(requestType, schema, endpointAvailability);

describe('generateBodyParams', () => {
  it('returns empty object for no_body', () => {
    expect(generateBodyParams(mockRequestType, mockSchema)).toEqual({});
  });

  it('returns empty object for scalar value body', () => {
    const requestType: SpecificationTypes.Request = {
      ...mockRequestType,
      body: {
        kind: 'value',
        value: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
      },
    };
    expect(generateBodyParams(requestType, mockSchema)).toEqual({});
  });

  it('generates empty string for string properties', () => {
    const requestType = makeRequestWithBody([getMockProperty({ propertyName: 'leader_index' })]);
    expect(generateBodyParams(requestType, mockSchema)).toEqual({ leader_index: '' });
  });

  it('generates boolean choices for boolean properties', () => {
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'expand_wildcards',
        type: { kind: 'instance_of', type: { name: 'boolean', namespace: '_builtins' } },
      }),
    ]);
    expect(generateBodyParams(requestType, mockSchema)).toEqual({
      expand_wildcards: { __one_of: [true, false] },
    });
  });

  it('generates empty string for property with server default', () => {
    const requestType = makeRequestWithBody([
      getMockProperty({ propertyName: 'timeout', serverDefault: '30s' }),
    ]);
    expect(generateBodyParams(requestType, mockSchema)).toEqual({ timeout: '' });
  });

  describe('WHEN property availability is narrower than the endpoint', () => {
    it('SHOULD emit only properties public in every endpoint environment', () => {
      const requestType = makeRequestWithBody([
        getMockProperty({ propertyName: 'unannotated' }),
        {
          ...getMockProperty({ propertyName: 'both' }),
          availability: allEndpointEnvironments,
        },
        {
          ...getMockProperty({ propertyName: 'stack_only' }),
          availability: { stack: {} },
        },
        {
          ...getMockProperty({ propertyName: 'serverless_only' }),
          availability: { serverless: {} },
        },
        {
          ...getMockProperty({ propertyName: 'feature_flagged' }),
          availability: {
            stack: {},
            serverless: { visibility: SpecificationTypes.Visibility.feature_flag },
          },
        },
      ]);

      expect(generateBodyParams(requestType, mockSchema)).toEqual({
        unannotated: '',
        both: '',
      });
    });

    it('SHOULD keep a stack-only property for a stack-only endpoint', () => {
      const requestType = makeRequestWithBody([
        {
          ...getMockProperty({ propertyName: 'stack_only' }),
          availability: { stack: {} },
        },
      ]);

      expect(generateBodyParams(requestType, mockSchema, { stack: {} })).toEqual({
        stack_only: '',
      });
    });

    it('SHOULD omit annotated properties when the endpoint has no public environment', () => {
      const requestType = makeRequestWithBody([
        {
          ...getMockProperty({ propertyName: 'stack_only' }),
          availability: { stack: {} },
        },
      ]);

      expect(generateBodyParams(requestType, mockSchema, {})).toEqual({});
    });

    it('SHOULD omit unannotated properties when the endpoint has no public environment', () => {
      const requestType = makeRequestWithBody([
        getMockProperty({ propertyName: 'secret_value' }),
        {
          ...getMockProperty({ propertyName: 'stack_only' }),
          availability: { stack: {} },
        },
      ]);

      expect(generateBodyParams(requestType, mockSchema, {})).toEqual({});
      expect(
        generateBodyParams(requestType, mockSchema, {
          stack: { visibility: SpecificationTypes.Visibility.private },
          serverless: { visibility: SpecificationTypes.Visibility.private },
        })
      ).toEqual({});
    });
  });

  it('generates __one_of for enum properties', () => {
    const enumType: SpecificationTypes.Enum = {
      kind: 'enum',
      name: { name: 'HealthStatus', namespace: '_types' },
      members: [{ name: 'green' }, { name: 'yellow' }, { name: 'red' }],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [enumType] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'status',
        type: { kind: 'instance_of', type: { name: 'HealthStatus', namespace: '_types' } },
      }),
    ]);
    expect(generateBodyParams(requestType, schema)).toEqual({
      status: { __one_of: ['green', 'yellow', 'red'] },
    });
  });

  it('WHEN enum member availability is narrower than the endpoint SHOULD emit only public members', () => {
    const enumType: SpecificationTypes.Enum = {
      kind: 'enum',
      name: { name: 'ClusterPrivilege', namespace: '_types' },
      members: [
        { name: 'unannotated' },
        { name: 'both', availability: allEndpointEnvironments },
        { name: 'stack_only', availability: { stack: {} } },
        { name: 'serverless_only', availability: { serverless: {} } },
      ],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [enumType] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'privileges',
        type: { kind: 'instance_of', type: enumType.name },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      privileges: { __one_of: ['unannotated', 'both'] },
    });
    expect(generateBodyParams(requestType, schema, { stack: {} })).toEqual({
      privileges: { __one_of: ['unannotated', 'both', 'stack_only'] },
    });
  });

  it('generates array placeholder for array of string properties', () => {
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'roles',
        type: {
          kind: 'array_of',
          value: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
        },
      }),
    ]);
    expect(generateBodyParams(requestType, mockSchema)).toEqual({ roles: [] });
  });

  it('generates __any_of for array of enum properties', () => {
    const enumType: SpecificationTypes.Enum = {
      kind: 'enum',
      name: { name: 'ExpandWildcard', namespace: '_types' },
      members: [
        { name: 'open' },
        { name: 'closed' },
        { name: 'hidden' },
        { name: 'none' },
        { name: 'all' },
      ],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [enumType] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'expand_wildcards',
        type: {
          kind: 'array_of',
          value: { kind: 'instance_of', type: { name: 'ExpandWildcard', namespace: '_types' } },
        },
      }),
    ]);
    expect(generateBodyParams(requestType, schema)).toEqual({
      expand_wildcards: { __any_of: ['open', 'closed', 'hidden', 'none', 'all'] },
    });
  });

  it('WHEN an array contains booleans SHOULD generate JSON boolean choices', () => {
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'flags',
        type: {
          kind: 'array_of',
          value: { kind: 'instance_of', type: { name: 'boolean', namespace: '_builtins' } },
        },
      }),
    ]);

    expect(generateBodyParams(requestType, mockSchema)).toEqual({
      flags: { __any_of: [true, false] },
    });
  });

  it('generates wildcard rules for scalar dictionaries', () => {
    const requestType = makeRequestWithBody([
      getMockProperty({ propertyName: 'flat_field' }),
      getMockProperty({
        propertyName: 'settings',
        type: {
          kind: 'dictionary_of',
          key: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
          value: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
          singleKey: false,
        },
      }),
    ]);
    expect(generateBodyParams(requestType, mockSchema)).toEqual({
      flat_field: '',
      settings: { '*': '' },
    });
  });

  it('leaves arbitrary user-defined dictionary values untyped', () => {
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'metadata',
        type: {
          kind: 'dictionary_of',
          key: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
          value: { kind: 'user_defined_value' },
          singleKey: false,
        },
      }),
    ]);

    expect(generateBodyParams(requestType, mockSchema)).toEqual({ metadata: {} });
  });

  it.each([
    ['string', 'azureopenai'],
    ['number', 42],
    ['boolean', true],
  ] as const)('preserves the JSON type for a literal %s value', (_type, value) => {
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'service',
        type: { kind: 'literal_value', value },
      }),
    ]);
    expect(generateBodyParams(requestType, mockSchema)).toEqual({ service: value });
  });

  it('recursively generates nested properties for interface types', () => {
    const innerInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'SourceFilter', namespace: '_types' },
      properties: [
        getMockProperty({
          propertyName: 'includes',
          type: {
            kind: 'array_of',
            value: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
          },
        }),
        getMockProperty({
          propertyName: 'excludes',
          type: {
            kind: 'array_of',
            value: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
          },
        }),
      ],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [innerInterface] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: '_source',
        type: { kind: 'instance_of', type: { name: 'SourceFilter', namespace: '_types' } },
      }),
    ]);
    expect(generateBodyParams(requestType, schema)).toEqual({
      _source: { includes: [], excludes: [] },
    });
  });

  it('generates both object and shortcut forms for shortcut interfaces', () => {
    const scriptInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'Script', namespace: '_types' },
      properties: [
        getMockProperty({ propertyName: 'source' }),
        getMockProperty({ propertyName: 'lang' }),
      ],
      shortcutProperty: 'source',
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [scriptInterface] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'script',
        type: { kind: 'instance_of', type: scriptInterface.name },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      script: {
        __one_of: [{ source: '', lang: '' }, ''],
      },
    });
  });

  it('WHEN an interface inherits properties SHOULD apply child properties last', () => {
    const parentInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'Parent', namespace: '_types' },
      properties: [
        getMockProperty({ propertyName: 'inherited' }),
        getMockProperty({
          propertyName: 'mode',
          type: { kind: 'instance_of', type: { name: 'boolean', namespace: '_builtins' } },
        }),
      ],
      specLocation: '',
    };
    const childInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'Child', namespace: '_types' },
      inherits: { type: parentInterface.name },
      properties: [getMockProperty({ propertyName: 'mode' })],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = {
      ...mockSchema,
      types: [parentInterface, childInterface],
    };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'child',
        type: { kind: 'instance_of', type: childInterface.name },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      child: { inherited: '', mode: '' },
    });
  });

  it('WHEN inherited properties use generics SHOULD substitute the concrete type', () => {
    const baseGenericName = { name: 'TValue', namespace: '_types.Base' };
    const childGenericName = { name: 'TValue', namespace: '_types.Child' };
    const baseInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'Base', namespace: '_types' },
      generics: [baseGenericName],
      properties: [
        getMockProperty({
          propertyName: 'value',
          type: { kind: 'instance_of', type: baseGenericName },
        }),
      ],
      specLocation: '',
    };
    const childInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'Child', namespace: '_types' },
      generics: [childGenericName],
      inherits: {
        type: baseInterface.name,
        generics: [{ kind: 'instance_of', type: childGenericName }],
      },
      properties: [],
      specLocation: '',
    };
    const valueEnum: SpecificationTypes.Enum = {
      kind: 'enum',
      name: { name: 'Value', namespace: '_types' },
      members: [{ name: 'first' }, { name: 'second' }],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = {
      ...mockSchema,
      types: [baseInterface, childInterface, valueEnum],
    };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'child',
        type: {
          kind: 'instance_of',
          type: childInterface.name,
          generics: [{ kind: 'instance_of', type: valueEnum.name }],
        },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      child: { value: { __one_of: ['first', 'second'] } },
    });
  });

  it('WHEN the request type inherits SHOULD add parent body properties with child precedence', () => {
    const parentInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'ParentRequestBase', namespace: '_types' },
      properties: [
        getMockProperty({ propertyName: 'inherited_prop' }),
        getMockProperty({
          propertyName: 'mode',
          type: { kind: 'instance_of', type: { name: 'boolean', namespace: '_builtins' } },
        }),
      ],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [parentInterface] };
    const requestType: SpecificationTypes.Request = {
      ...makeRequestWithBody([getMockProperty({ propertyName: 'mode' })]),
      inherits: { type: parentInterface.name },
    };

    expect(generateBodyParams(requestType, schema)).toEqual({
      inherited_prop: '',
      mode: '',
    });
  });

  it('WHEN the parent interface has a shortcut property SHOULD still inherit its properties', () => {
    const parentInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'ShortcutParent', namespace: '_types' },
      properties: [
        getMockProperty({ propertyName: 'source' }),
        getMockProperty({ propertyName: 'lang' }),
      ],
      shortcutProperty: 'source',
      specLocation: '',
    };
    const childInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'Child', namespace: '_types' },
      inherits: { type: parentInterface.name },
      properties: [getMockProperty({ propertyName: 'extra' })],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = {
      ...mockSchema,
      types: [parentInterface, childInterface],
    };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'child',
        type: { kind: 'instance_of', type: childInterface.name },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      child: { source: '', lang: '', extra: '' },
    });
  });

  it('returns __scope_link to GLOBAL.query for QueryContainer', () => {
    const queryContainer: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'QueryContainer', namespace: '_types.query_dsl' },
      properties: [
        getMockProperty({ propertyName: 'bool' }),
        getMockProperty({ propertyName: 'term' }),
      ],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [queryContainer] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'query',
        type: {
          kind: 'instance_of',
          type: { name: 'QueryContainer', namespace: '_types.query_dsl' },
        },
      }),
    ]);
    expect(generateBodyParams(requestType, schema)).toEqual({
      query: { __scope_link: 'GLOBAL.query' },
    });
  });

  it('WHEN QueryContainer has another namespace SHOULD generate its declared properties', () => {
    const queryContainer: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'QueryContainer', namespace: 'custom' },
      properties: [getMockProperty({ propertyName: 'custom_query' })],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [queryContainer] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'query',
        type: { kind: 'instance_of', type: queryContainer.name },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      query: { custom_query: '' },
    });
  });

  it('returns {} for cyclic interface references instead of infinite recursion', () => {
    const selfRefInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'TreeNode', namespace: '_types' },
      properties: [
        getMockProperty({ propertyName: 'value' }),
        getMockProperty({
          propertyName: 'child',
          type: { kind: 'instance_of', type: { name: 'TreeNode', namespace: '_types' } },
        }),
      ],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [selfRefInterface] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'root',
        type: { kind: 'instance_of', type: { name: 'TreeNode', namespace: '_types' } },
      }),
    ]);
    expect(generateBodyParams(requestType, schema)).toEqual({
      root: { value: '', child: {} },
    });
  });

  it('generates nested shape for union of boolean and interface (_source pattern)', () => {
    const sourceFilter: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'SourceFilter', namespace: '_types' },
      properties: [
        getMockProperty({
          propertyName: 'includes',
          type: {
            kind: 'array_of',
            value: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
          },
        }),
      ],
      shortcutProperty: 'includes',
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [sourceFilter] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: '_source',
        type: {
          kind: 'union_of',
          items: [
            { kind: 'instance_of', type: { name: 'boolean', namespace: '_builtins' } },
            { kind: 'instance_of', type: { name: 'SourceFilter', namespace: '_types' } },
          ],
        },
      }),
    ]);
    expect(generateBodyParams(requestType, schema)).toEqual({
      _source: {
        __one_of: [true, false, { includes: [] }, []],
      },
    });
  });

  it('WHEN a union has a boolean and an interface without a shortcut SHOULD keep both forms', () => {
    const docValuesConfig: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'DocValuesConfig', namespace: '_types.mapping' },
      properties: [getMockProperty({ propertyName: 'format' })],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [docValuesConfig] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'doc_values',
        type: {
          kind: 'union_of',
          items: [
            { kind: 'instance_of', type: { name: 'boolean', namespace: '_builtins' } },
            { kind: 'instance_of', type: docValuesConfig.name },
          ],
        },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      doc_values: {
        __one_of: [{ format: '' }, true, false],
      },
    });
  });

  it('WHEN a union has an interface and an array of that interface SHOULD keep both forms', () => {
    const knnSearch: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'KnnSearch', namespace: '_types' },
      properties: [getMockProperty({ propertyName: 'field' })],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [knnSearch] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'knn',
        type: {
          kind: 'union_of',
          items: [
            { kind: 'instance_of', type: knnSearch.name },
            {
              kind: 'array_of',
              value: { kind: 'instance_of', type: knnSearch.name },
            },
          ],
        },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      knn: {
        __one_of: [{ field: '' }, [{ field: '' }]],
      },
    });
  });

  it('WHEN a union has an object and multiple distinct array forms SHOULD keep every array form', () => {
    const objType: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'ObjType', namespace: '_types' },
      properties: [getMockProperty({ propertyName: 'field' })],
      specLocation: '',
    };
    const itemType: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'ItemType', namespace: '_types' },
      properties: [getMockProperty({ propertyName: 'name' })],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [objType, itemType] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'target',
        type: {
          kind: 'union_of',
          items: [
            { kind: 'instance_of', type: objType.name },
            {
              kind: 'array_of',
              value: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
            },
            { kind: 'array_of', value: { kind: 'instance_of', type: itemType.name } },
          ],
        },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      target: {
        __one_of: [{ field: '' }, [], [{ name: '' }]],
      },
    });
  });

  it('WHEN a union has only multiple distinct array forms SHOULD keep every array form', () => {
    const itemType: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'ItemType', namespace: '_types' },
      properties: [getMockProperty({ propertyName: 'name' })],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [itemType] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'target',
        type: {
          kind: 'union_of',
          items: [
            {
              kind: 'array_of',
              value: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
            },
            { kind: 'array_of', value: { kind: 'instance_of', type: itemType.name } },
          ],
        },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      target: {
        __one_of: [[], [{ name: '' }]],
      },
    });
  });

  it('generates __one_of for union of enums', () => {
    const enumA: SpecificationTypes.Enum = {
      kind: 'enum',
      name: { name: 'EnumA', namespace: '_types' },
      members: [{ name: 'a1' }, { name: 'a2' }],
      specLocation: '',
    };
    const enumB: SpecificationTypes.Enum = {
      kind: 'enum',
      name: { name: 'EnumB', namespace: '_types' },
      members: [{ name: 'b1' }],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [enumA, enumB] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'combined',
        type: {
          kind: 'union_of',
          items: [
            { kind: 'instance_of', type: { name: 'EnumA', namespace: '_types' } },
            { kind: 'instance_of', type: { name: 'EnumB', namespace: '_types' } },
          ],
        },
      }),
    ]);
    expect(generateBodyParams(requestType, schema)).toEqual({
      combined: { __one_of: ['a1', 'a2', 'b1'] },
    });
  });

  it('WHEN a union has multiple object branches SHOULD keep only common rules', () => {
    const firstInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'First', namespace: '_types' },
      properties: [
        getMockProperty({ propertyName: 'common' }),
        getMockProperty({ propertyName: 'first_only' }),
      ],
      specLocation: '',
    };
    const secondInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'Second', namespace: '_types' },
      properties: [
        getMockProperty({ propertyName: 'common' }),
        getMockProperty({ propertyName: 'second_only' }),
      ],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = {
      ...mockSchema,
      types: [firstInterface, secondInterface],
    };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'variant',
        type: {
          kind: 'union_of',
          items: [
            { kind: 'instance_of', type: firstInterface.name },
            { kind: 'instance_of', type: secondInterface.name },
          ],
        },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      variant: { common: '' },
    });
  });

  it('WHEN intersecting object branches SHOULD compare dotted keys and reordered objects structurally', () => {
    // dotted property names (e.g. index settings) must not be treated as
    // lodash paths, and nested objects must compare key-order-insensitively
    const firstInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'FirstSettings', namespace: '_types' },
      properties: [
        getMockProperty({ propertyName: 'index.number_of_replicas' }),
        getMockProperty({
          propertyName: 'nested',
          type: { kind: 'instance_of', type: { name: 'Nested', namespace: '_types' } },
        }),
      ],
      specLocation: '',
    };
    const secondInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'SecondSettings', namespace: '_types' },
      properties: [
        getMockProperty({ propertyName: 'index.number_of_replicas' }),
        getMockProperty({
          propertyName: 'nested',
          type: { kind: 'instance_of', type: { name: 'Nested', namespace: '_types' } },
        }),
      ],
      specLocation: '',
    };
    const nestedInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'Nested', namespace: '_types' },
      properties: [
        getMockProperty({ propertyName: 'alpha' }),
        getMockProperty({ propertyName: 'beta' }),
      ],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = {
      ...mockSchema,
      types: [firstInterface, secondInterface, nestedInterface],
    };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'settings',
        type: {
          kind: 'union_of',
          items: [
            { kind: 'instance_of', type: firstInterface.name },
            { kind: 'instance_of', type: secondInterface.name },
          ],
        },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      settings: {
        'index.number_of_replicas': '',
        nested: { alpha: '', beta: '' },
      },
    });
  });

  it('WHEN union branches convert to equal choices SHOULD deduplicate them', () => {
    const enumA: SpecificationTypes.Enum = {
      kind: 'enum',
      name: { name: 'EnumA', namespace: '_types' },
      members: [{ name: 'shared' }, { name: 'a_only' }],
      specLocation: '',
    };
    const enumB: SpecificationTypes.Enum = {
      kind: 'enum',
      name: { name: 'EnumB', namespace: '_types' },
      members: [{ name: 'shared' }, { name: 'b_only' }],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [enumA, enumB] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'combined',
        type: {
          kind: 'union_of',
          items: [
            { kind: 'instance_of', type: enumA.name },
            { kind: 'instance_of', type: enumB.name },
          ],
        },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      combined: { __one_of: ['shared', 'a_only', 'b_only'] },
    });
  });

  it('generates empty string for union containing an open-ended string type', () => {
    const enumType: SpecificationTypes.Enum = {
      kind: 'enum',
      name: { name: 'SomeEnum', namespace: '_types' },
      members: [{ name: 'val1' }],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [enumType] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'mixed',
        type: {
          kind: 'union_of',
          items: [
            { kind: 'instance_of', type: { name: 'SomeEnum', namespace: '_types' } },
            { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
          ],
        },
      }),
    ]);
    expect(generateBodyParams(requestType, schema)).toEqual({ mixed: '' });
  });

  it('WHEN a value body resolves to an object SHOULD generate its properties', () => {
    const bodyInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'Body', namespace: '_types' },
      properties: [getMockProperty({ propertyName: 'name' })],
      specLocation: '',
    };
    const bodyAlias: SpecificationTypes.TypeAlias = {
      kind: 'type_alias',
      name: { name: 'BodyAlias', namespace: '_types' },
      type: { kind: 'instance_of', type: bodyInterface.name },
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = {
      ...mockSchema,
      types: [bodyInterface, bodyAlias],
    };
    const requestType: SpecificationTypes.Request = {
      ...mockRequestType,
      body: {
        kind: 'value',
        value: { kind: 'instance_of', type: bodyAlias.name },
      },
    };

    expect(generateBodyParams(requestType, schema)).toEqual({ name: '' });
  });

  it('WHEN a dictionary value is typed SHOULD generate wildcard value rules', () => {
    const dictionaryValue: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'DictionaryValue', namespace: '_types' },
      properties: [
        getMockProperty({
          propertyName: 'enabled',
          type: { kind: 'instance_of', type: { name: 'boolean', namespace: '_builtins' } },
        }),
      ],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [dictionaryValue] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'entries',
        type: {
          kind: 'dictionary_of',
          key: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
          value: { kind: 'instance_of', type: dictionaryValue.name },
          singleKey: false,
        },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      entries: { '*': { enabled: { __one_of: [true, false] } } },
    });
  });

  it.each(['AdditionalProperty', 'AdditionalProperties'] as const)(
    'WHEN an interface declares %s behavior SHOULD generate wildcard rules',
    (behaviorName) => {
      const fieldSort: SpecificationTypes.Interface = {
        kind: 'interface',
        name: { name: 'FieldSort', namespace: '_types' },
        properties: [
          getMockProperty({
            propertyName: 'order',
            type: { kind: 'instance_of', type: { name: 'boolean', namespace: '_builtins' } },
          }),
        ],
        specLocation: '',
      };
      const sortOptions: SpecificationTypes.Interface = {
        kind: 'interface',
        name: { name: 'SortOptions', namespace: '_types' },
        behaviors: [
          {
            type: { name: behaviorName, namespace: '_spec_utils' },
            generics: [
              { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
              { kind: 'instance_of', type: fieldSort.name },
            ],
          },
        ],
        properties: [getMockProperty({ propertyName: '_doc' })],
        specLocation: '',
      };
      const schema: SpecificationTypes.Model = {
        ...mockSchema,
        types: [fieldSort, sortOptions],
      };
      const requestType = makeRequestWithBody([
        getMockProperty({
          propertyName: 'sort',
          type: { kind: 'instance_of', type: sortOptions.name },
        }),
      ]);

      expect(generateBodyParams(requestType, schema)).toEqual({
        sort: {
          '*': { order: { __one_of: [true, false] } },
          _doc: '',
        },
      });
    }
  );

  it('WHEN an array contains objects SHOULD generate an object item rule', () => {
    const itemInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'Item', namespace: '_types' },
      properties: [getMockProperty({ propertyName: 'name' })],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [itemInterface] };
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'items',
        type: {
          kind: 'array_of',
          value: { kind: 'instance_of', type: itemInterface.name },
        },
      }),
    ]);

    expect(generateBodyParams(requestType, schema)).toEqual({
      items: [{ name: '' }],
    });
  });

  it('handles multiple flat properties together', () => {
    const requestType = makeRequestWithBody([
      getMockProperty({ propertyName: 'remote_cluster' }),
      getMockProperty({ propertyName: 'leader_index' }),
      getMockProperty({ propertyName: 'max_outstanding_read_requests', serverDefault: '12' }),
    ]);
    expect(generateBodyParams(requestType, mockSchema)).toEqual({
      remote_cluster: '',
      leader_index: '',
      max_outstanding_read_requests: '',
    });
  });
});
