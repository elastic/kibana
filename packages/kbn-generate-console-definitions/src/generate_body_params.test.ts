/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpecificationTypes } from './types';
import { generateBodyParams } from './generate_body_params';
import { getMockProperty, mockRequestType, mockSchema } from './helpers/test_helpers';

const makeRequestWithBody = (
  properties: SpecificationTypes.Property[]
): SpecificationTypes.Request => ({
  ...mockRequestType,
  body: { kind: 'properties', properties },
});

describe('generateBodyParams', () => {
  it('returns empty object for no_body', () => {
    expect(generateBodyParams(mockRequestType, mockSchema)).toEqual({});
  });

  it('returns empty object for value body', () => {
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

  it('generates __flag__ for boolean properties', () => {
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'expand_wildcards',
        type: { kind: 'instance_of', type: { name: 'boolean', namespace: '_builtins' } },
      }),
    ]);
    expect(generateBodyParams(requestType, mockSchema)).toEqual({ expand_wildcards: '__flag__' });
  });

  it('generates empty string for property with server default', () => {
    const requestType = makeRequestWithBody([
      getMockProperty({ propertyName: 'timeout', serverDefault: '30s' }),
    ]);
    expect(generateBodyParams(requestType, mockSchema)).toEqual({ timeout: '' });
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
      members: [{ name: 'open' }, { name: 'closed' }, { name: 'hidden' }, { name: 'none' }, { name: 'all' }],
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

  it('generates {} for dictionary properties', () => {
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
    expect(generateBodyParams(requestType, mockSchema)).toEqual({ flat_field: '', settings: {} });
  });

  it('generates the literal string for literal value', () => {
    const requestType = makeRequestWithBody([
      getMockProperty({
        propertyName: 'service',
        type: { kind: 'literal_value', value: 'azureopenai' },
      }),
    ]);
    expect(generateBodyParams(requestType, mockSchema)).toEqual({ service: 'azureopenai' });
  });

  it('recursively generates nested properties for interface types', () => {
    const innerInterface: SpecificationTypes.Interface = {
      kind: 'interface',
      name: { name: 'SourceFilter', namespace: '_types' },
      properties: [
        getMockProperty({ propertyName: 'includes', type: { kind: 'array_of', value: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } } } }),
        getMockProperty({ propertyName: 'excludes', type: { kind: 'array_of', value: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } } } }),
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
        getMockProperty({ propertyName: 'includes', type: { kind: 'array_of', value: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } } } }),
      ],
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
    expect(generateBodyParams(requestType, schema)).toEqual({ _source: { includes: [] } });
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
