/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { generateUrlComponents } from './generate_url_components';
import { getMockProperty, mockRequestType, mockSchema } from './helpers/test_helpers';
import { SpecificationTypes } from './types';

describe('generateUrlComponents', () => {
  it('generates url components from path', () => {
    const urlComponentProperty1 = getMockProperty({
      propertyName: 'property1',
      typeName: { name: 'EnumType1', namespace: 'test.namespace' },
    });
    const enumType1: SpecificationTypes.Enum = {
      kind: 'enum',
      members: [
        {
          name: 'value1',
        },
        {
          name: 'value2',
        },
      ],
      name: {
        name: 'EnumType1',
        namespace: 'test.namespace',
      },
      specLocation: '',
    };
    const urlComponentProperty2 = getMockProperty({
      propertyName: 'property2',
      typeName: { name: 'EnumType2', namespace: 'test.namespace' },
    });
    const enumType2: SpecificationTypes.Enum = {
      kind: 'enum',
      members: [
        {
          name: 'anotherValue1',
        },
        {
          name: 'anotherValue2',
        },
      ],
      name: {
        name: 'EnumType2',
        namespace: 'test.namespace',
      },
      specLocation: '',
    };
    const requestType: SpecificationTypes.Request = {
      ...mockRequestType,
      path: [urlComponentProperty1, urlComponentProperty2],
    };
    const schema: SpecificationTypes.Model = { ...mockSchema, types: [enumType1, enumType2] };
    const urlComponents = generateUrlComponents(requestType, schema);
    expect(urlComponents).toEqual({
      property1: ['value1', 'value2'],
      property2: ['anotherValue1', 'anotherValue2'],
    });
  });

  it('removes url components without any values (empty string)', () => {
    const requestType: SpecificationTypes.Request = {
      ...mockRequestType,
      path: [getMockProperty({ propertyName: 'emptyStringProperty' })],
    };
    const urlComponents = generateUrlComponents(requestType, mockSchema);
    expect(urlComponents).toEqual({});
  });

  it('removes url components without any values (empty array)', () => {
    const emptyArrayProperty = getMockProperty({
      propertyName: 'emptyArrayProperty',
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
            kind: 'array_of',
            value: {
              kind: 'instance_of',
              type: {
                name: 'string',
                namespace: '_builtins',
              },
            },
          },
        ],
      },
    });
    const requestType: SpecificationTypes.Request = {
      ...mockRequestType,
      path: [emptyArrayProperty],
    };
    const urlComponents = generateUrlComponents(requestType, mockSchema);
    expect(urlComponents).toEqual({});
  });
});
