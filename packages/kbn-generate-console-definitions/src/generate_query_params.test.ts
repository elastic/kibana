/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SpecificationTypes } from './types';
import { generateQueryParams } from './generate_query_params';
import { UrlParamValue } from './types/autocomplete_definition_types';

describe('generateQueryParams', () => {
  const mockRequestType: SpecificationTypes.Request = {
    body: { kind: 'no_body' },
    kind: 'request',
    name: {
      name: 'TestRequest',
      namespace: 'test.namespace',
    },
    path: [],
    query: [],
    specLocation: '',
  };

  const getMockProperty = ({
    propertyName,
    typeName,
    serverDefault,
    type,
  }: {
    propertyName: string;
    typeName?: SpecificationTypes.TypeName;
    serverDefault?: SpecificationTypes.Property['serverDefault'];
    type?: SpecificationTypes.ValueOf;
  }): SpecificationTypes.Property => {
    return {
      description: 'Description',
      name: propertyName,
      required: false,
      serverDefault: serverDefault ?? undefined,
      type: type ?? {
        kind: 'instance_of',
        type: typeName ?? {
          name: 'string',
          namespace: '_builtins',
        },
      },
    };
  };

  const mockSchema: SpecificationTypes.Model = {
    endpoints: [],
    types: [],
  };

  it('iterates over attachedBehaviours', () => {
    const behaviour1: SpecificationTypes.Interface = {
      kind: 'interface',
      name: {
        name: 'behaviour1',
        namespace: 'test.namespace',
      },
      properties: [getMockProperty({ propertyName: 'property1' })],
      specLocation: '',
    };
    const behaviour2: SpecificationTypes.Interface = {
      kind: 'interface',
      name: {
        name: 'behaviour2',
        namespace: 'test.namespace',
      },
      properties: [
        getMockProperty({ propertyName: 'property2' }),
        getMockProperty({ propertyName: 'property3' }),
      ],
      specLocation: '',
    };
    const schema: SpecificationTypes.Model = {
      ...mockSchema,
      types: [behaviour1, behaviour2],
    };
    const requestType: SpecificationTypes.Request = {
      ...mockRequestType,
      attachedBehaviors: ['behaviour1', 'behaviour2'],
    };
    const urlParams = generateQueryParams(requestType, schema);
    expect(urlParams).toEqual({
      property1: '',
      property2: '',
      property3: '',
    });
  });

  it('iterates over query properties', () => {
    const requestType = {
      ...mockRequestType,
      query: [
        getMockProperty({ propertyName: 'property1' }),
        getMockProperty({ propertyName: 'property2' }),
      ],
    };
    const urlParams = generateQueryParams(requestType, mockSchema);
    expect(urlParams).toEqual({
      property1: '',
      property2: '',
    });
  });

  it('converts builtin types', () => {
    const stringProperty = getMockProperty({
      propertyName: 'stringProperty',
      typeName: { name: 'string', namespace: '_builtins' },
    });
    const numberProperty = getMockProperty({
      propertyName: 'numberProperty',
      typeName: { name: 'number', namespace: '_builtins' },
    });
    const booleanProperty = getMockProperty({
      propertyName: 'booleanProperty',
      typeName: { name: 'boolean', namespace: '_builtins' },
    });
    const requestType = {
      ...mockRequestType,
      query: [stringProperty, numberProperty, booleanProperty],
    };
    const urlParams = generateQueryParams(requestType, mockSchema);
    expect(urlParams).toEqual({
      stringProperty: '',
      numberProperty: '',
      booleanProperty: '__flag__',
    });
  });

  it('adds serverDefault value if any', () => {
    const propertyWithDefault = getMockProperty({
      propertyName: 'propertyWithDefault',
      serverDefault: 'default',
    });
    const requestType = { ...mockRequestType, query: [propertyWithDefault] };
    const urlParams = generateQueryParams(requestType, mockSchema);
    expect(urlParams).toEqual({
      propertyWithDefault: ['default'],
    });
  });

  it('converts an enum property', () => {
    const enumProperty = getMockProperty({
      propertyName: 'enumProperty',
      typeName: { name: 'EnumType', namespace: 'test.namespace' },
    });
    const enumType: SpecificationTypes.Enum = {
      kind: 'enum',
      members: [
        {
          name: 'enum1',
        },
        {
          name: 'enum2',
        },
      ],
      name: {
        name: 'EnumType',
        namespace: 'test.namespace',
      },
      specLocation: '',
    };
    const requestType = { ...mockRequestType, query: [enumProperty] };
    const schema = { ...mockSchema, types: [enumType] };
    const urlParams = generateQueryParams(requestType, schema);
    expect(urlParams).toEqual({
      enumProperty: ['enum1', 'enum2'],
    });
  });

  it('converts a type alias', () => {
    const typeAliasProperty = getMockProperty({
      propertyName: 'typeAliasProperty',
      typeName: {
        name: 'SomeTypeAlias',
        namespace: 'test.namespace',
      },
    });
    const typeAliasType: SpecificationTypes.TypeAlias = {
      kind: 'type_alias',
      name: {
        name: 'SomeTypeAlias',
        namespace: 'test.namespace',
      },
      specLocation: '',
      type: {
        kind: 'instance_of',
        type: {
          name: 'integer',
          namespace: '_types',
        },
      },
    };
    const requestType = { ...mockRequestType, query: [typeAliasProperty] };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [typeAliasType] };
    const urlParams = generateQueryParams(requestType, schema);
    expect(urlParams).toEqual({
      typeAliasProperty: '',
    });
  });

  it('converts a literal_value to a string', () => {
    const stringProperty = getMockProperty({
      propertyName: 'stringProperty',
      type: { kind: 'literal_value', value: 'stringValue' },
    });
    const numberProperty = getMockProperty({
      propertyName: 'numberProperty',
      type: { kind: 'literal_value', value: 14 },
    });
    const booleanProperty = getMockProperty({
      propertyName: 'booleanProperty',
      type: { kind: 'literal_value', value: true },
    });
    const requestType = {
      ...mockRequestType,
      query: [stringProperty, numberProperty, booleanProperty],
    };
    const urlParams = generateQueryParams(requestType, mockSchema);
    expect(urlParams).toEqual({
      stringProperty: ['stringValue'],
      numberProperty: ['14'],
      booleanProperty: ['true'],
    });
  });

  describe('converts a union_of', () => {
    it('flattens the array if one of the items is converted to an array', () => {
      const enumType: SpecificationTypes.Enum = {
        kind: 'enum',
        members: [
          {
            name: 'enum1',
          },
          { name: 'enum2' },
        ],
        name: { name: 'EnumType', namespace: 'test.namespace' },
        specLocation: '',
      };
      const unionProperty = getMockProperty({
        propertyName: 'unionProperty',
        type: {
          kind: 'union_of',
          items: [
            {
              kind: 'instance_of',
              type: {
                name: 'EnumType',
                namespace: 'test.namespace',
              },
            },
          ],
        },
      });
      const requestType = { ...mockRequestType, query: [unionProperty] };
      const schema: SpecificationTypes.Model = { ...mockSchema, types: [enumType] };
      const urlParams = generateQueryParams(requestType, schema);
      expect(urlParams).toEqual({
        unionProperty: ['enum1', 'enum2'],
      });
    });

    it('removes empty string from the array', () => {
      const unionProperty = getMockProperty({
        propertyName: 'unionProperty',
        type: {
          kind: 'union_of',
          items: [
            {
              kind: 'instance_of',
              type: {
                name: 'string',
                namespace: '_builtins',
              },
            },
          ],
        },
      });
      const requestType = { ...mockRequestType, query: [unionProperty] };
      const urlParams = generateQueryParams(requestType, mockSchema);
      expect(urlParams).toEqual({
        unionProperty: [],
      });
    });

    it('if one item is a boolean and others are empty, converts to a flag', () => {
      const unionProperty = getMockProperty({
        propertyName: 'unionProperty',
        type: {
          kind: 'union_of',
          items: [
            {
              kind: 'instance_of',
              type: {
                name: 'string',
                namespace: '_builtins',
              },
            },
            {
              kind: 'instance_of',
              type: {
                name: 'number',
                namespace: '_builtins',
              },
            },
            {
              kind: 'instance_of',
              type: {
                name: 'boolean',
                namespace: '_builtins',
              },
            },
          ],
        },
      });
      const requestType = { ...mockRequestType, query: [unionProperty] };
      const urlParams = generateQueryParams(requestType, mockSchema);
      expect(urlParams).toEqual({
        unionProperty: '__flag__',
      });
    });

    it('if one item is an unknown type, converts it to an empty string', () => {
      const unionProperty = getMockProperty({
        propertyName: 'unionProperty',
        type: {
          kind: 'union_of',
          items: [
            {
              kind: 'literal_value',
              value: 'test',
            },
            {
              kind: 'instance_of',
              type: {
                name: 'UnknownType',
                namespace: 'test.namespace',
              },
            },
          ],
        },
      });

      const requestType = { ...mockRequestType, query: [unionProperty] };
      const urlParams = generateQueryParams(requestType, mockSchema);
      // check that no `undefined` values are added
      const value = urlParams.unionProperty as UrlParamValue[];
      expect(value.length).toEqual(1);
    });
  });

  it('converts an unknown type to an empty string', () => {
    const unknownTypeProperty = getMockProperty({
      propertyName: 'unknownTypeProperty',
      type: {
        kind: 'instance_of',
        type: {
          name: 'UnknownType',
          namespace: 'test.namespace',
        },
      },
    });

    const requestType = { ...mockRequestType, query: [unknownTypeProperty] };
    const urlParams = generateQueryParams(requestType, mockSchema);
    expect(urlParams).toEqual({
      unknownTypeProperty: '',
    });
  });
});
