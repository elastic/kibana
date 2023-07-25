/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BodyParamsConverter } from '../src/body_params_converter';
import type { SpecificationTypes as S } from '../src/types';
import {
  getMockProperty,
  mockBooleanProperty,
  mockNumberProperty,
  mockSchema,
  mockStringProperty,
} from '.';

describe('BodyParamsConverter', () => {
  it('converts the request body of type NoBody as an empty object', () => {
    const bodyParamsConverter = new BodyParamsConverter(mockSchema);
    const body: S.NoBody = { kind: 'no_body' };
    const params = bodyParamsConverter.generate(body);
    expect(params).toEqual({});
  });

  it('converts each property of the request body of type PropertiesBody', () => {
    const bodyParamsConverter = new BodyParamsConverter(mockSchema);

    const body: S.PropertiesBody = {
      kind: 'properties',
      properties: [
        getMockProperty({ propertyName: 'property1' }),
        getMockProperty({ propertyName: 'property2' }),
      ],
    };
    const params = bodyParamsConverter.generate(body);
    expect(params).toEqual({
      property1: '',
      property2: '',
    });
  });

  it('converts the value of the request body of type ValueBody', () => {
    const bodyParamsConverter = new BodyParamsConverter(mockSchema);

    const body: S.ValueBody = {
      value: {
        kind: 'instance_of',
        type: {
          name: 'string',
          namespace: '_builtins',
        },
      },
      kind: 'value',
    };
    const params = bodyParamsConverter.generate(body);
    expect(params).toEqual('');
  });

  it('converts builtin types', () => {
    const bodyParamsConverter = new BodyParamsConverter(mockSchema);

    const body: S.PropertiesBody = {
      kind: 'properties',
      properties: [mockStringProperty, mockNumberProperty, mockBooleanProperty],
    };
    const params = bodyParamsConverter.generate(body);
    expect(params).toEqual({
      stringProperty: '',
      numberProperty: '',
      booleanProperty: { __one_of: [true, false] },
    });
  });

  it('converts with default values', () => {
    const bodyParamsConverter = new BodyParamsConverter(mockSchema);

    const body: S.PropertiesBody = {
      kind: 'properties',
      properties: [
        { ...mockStringProperty, serverDefault: 'test' },
        { ...mockNumberProperty, serverDefault: 42 },
        { ...mockBooleanProperty, serverDefault: true },
      ],
    };
    const params = bodyParamsConverter.generate(body);
    expect(params).toEqual({
      stringProperty: 'test',
      numberProperty: '42',
      booleanProperty: true,
    });
  });

  it('converts interface', () => {
    const interfaceType: S.Interface = {
      kind: 'interface',
      name: {
        name: 'interface',
        namespace: 'test.namespace',
      },
      properties: [getMockProperty({ propertyName: 'interfaceProperty' })],
      specLocation: '',
    };
    const schema = { ...mockSchema, types: [interfaceType] };
    const bodyParamsConverter = new BodyParamsConverter(schema);

    const body: S.PropertiesBody = {
      properties: [
        getMockProperty({
          propertyName: 'property1',
          typeName: {
            name: 'interface',
            namespace: 'test.namespace',
          },
        }),
      ],
      kind: 'properties',
    };
    const params = bodyParamsConverter.generate(body);
    expect(params).toEqual({
      property1: {
        interfaceProperty: '',
      },
    });
  });

  it('converts enum', () => {
    const enumType: S.Enum = {
      kind: 'enum',
      name: {
        name: 'enumType',
        namespace: 'test.namespace',
      },
      members: [{ name: 'value1' }, { name: 'value2' }],
      specLocation: '',
    };
    const schema = { ...mockSchema, types: [enumType] };
    const bodyParamsConverter = new BodyParamsConverter(schema);

    const body: S.PropertiesBody = {
      properties: [
        getMockProperty({
          propertyName: 'property1',
          typeName: {
            name: 'enumType',
            namespace: 'test.namespace',
          },
        }),
      ],
      kind: 'properties',
    };

    const params = bodyParamsConverter.generate(body);
    expect(params).toEqual({ property1: { __one_of: ['value1', 'value2'] } });
  });

  it('converts typeAlias', () => {
    const aliasType: S.TypeAlias = {
      kind: 'type_alias',
      name: {
        name: 'aliasType',
        namespace: 'test.namespace',
      },
      type: { kind: 'instance_of', type: { name: 'string', namespace: '_builtins' } },
      specLocation: '',
    };
    const schema = { ...mockSchema, types: [aliasType] };
    const bodyParamsConverter = new BodyParamsConverter(schema);

    const body: S.PropertiesBody = {
      properties: [
        getMockProperty({
          propertyName: 'property1',
          typeName: {
            name: 'aliasType',
            namespace: 'test.namespace',
          },
        }),
      ],
      kind: 'properties',
    };
    const params = bodyParamsConverter.generate(body);
    expect(params).toEqual({ property1: '' });
  });

  it('converts dictionary', () => {
    const dictionary: S.DictionaryOf = {
      singleKey: false,
      kind: 'dictionary_of',
      key: {
        kind: 'instance_of',
        type: {
          name: 'string',
          namespace: '_builtins',
        },
      },
      value: {
        kind: 'instance_of',
        type: {
          name: 'boolean',
          namespace: '_builtins',
        },
      },
    };

    const bodyParamsConverter = new BodyParamsConverter(mockSchema);

    const body: S.PropertiesBody = {
      properties: [
        getMockProperty({
          propertyName: 'property1',
          type: dictionary,
        }),
      ],
      kind: 'properties',
    };
    const params = bodyParamsConverter.generate(body);
    expect(params).toEqual({
      property1: {
        NAME: {
          __one_of: [true, false],
        },
      },
    });
  });

  it('converts literal value', () => {
    const literalValue: S.LiteralValue = {
      kind: 'literal_value',
      value: 42,
    };

    const bodyParamsConverter = new BodyParamsConverter(mockSchema);

    const body: S.PropertiesBody = {
      properties: [
        getMockProperty({
          propertyName: 'property1',
          type: literalValue,
        }),
      ],
      kind: 'properties',
    };
    const params = bodyParamsConverter.generate(body);
    expect(params).toEqual({
      property1: 42,
    });
  });

  it('converts literal value with curly braces to upper case text', () => {
    const literalValue: S.LiteralValue = {
      kind: 'literal_value',
      value: '{dynamic_property}',
    };

    const bodyParamsConverter = new BodyParamsConverter(mockSchema);

    const body: S.PropertiesBody = {
      properties: [
        getMockProperty({
          propertyName: 'property1',
          type: literalValue,
        }),
      ],
      kind: 'properties',
    };
    const params = bodyParamsConverter.generate(body);
    expect(params).toEqual({
      property1: 'DYNAMIC_PROPERTY',
    });
  });

  it('adds a global type and converts it', () => {
    const policyInstance: S.InstanceOf = {
      kind: 'instance_of',
      type: {
        name: 'policy',
        namespace: 'test.namespace',
      },
    };
    const phaseInstance: S.InstanceOf = {
      kind: 'instance_of',
      type: {
        name: 'phase',
        namespace: 'test.namespace',
      },
    };

    const policyTypeDefinition: S.Interface = {
      kind: 'interface',
      name: {
        name: 'policy',
        namespace: 'test.namespace',
      },
      properties: [getMockProperty({ propertyName: 'phase', type: phaseInstance })],
      specLocation: '',
    };

    const phaseTypeDefinition: S.Interface = {
      kind: 'interface',
      name: {
        name: 'phase',
        namespace: 'test.namespace',
      },
      properties: [
        getMockProperty({
          propertyName: 'innerPolicyField',
          // the recursion of types happens here
          type: policyInstance,
        }),
        getMockProperty({ propertyName: 'phaseField' }),
      ],
      specLocation: '',
    };

    const schema = { ...mockSchema, types: [policyTypeDefinition, phaseTypeDefinition] };
    const bodyParamsConverter = new BodyParamsConverter(schema);

    const body: S.PropertiesBody = {
      properties: [
        getMockProperty({
          propertyName: 'property1',
          type: policyInstance,
        }),
      ],
      kind: 'properties',
    };
    const params = bodyParamsConverter.generate(body);
    expect(params).toEqual({
      property1: {
        phase: {
          innerPolicyField: {
            __scope_link: 'GLOBAL.test.namespace.policy',
          },
          phaseField: '',
        },
      },
    });
    const globalTypes = bodyParamsConverter.getGlobalTypes();
    expect(globalTypes.length).toEqual(1);
    expect(globalTypes[0]).toEqual({
      name: 'policy',
      namespace: 'test.namespace',
    });
    const globalTypeDefinitions = bodyParamsConverter.convertGlobals();
    expect(globalTypeDefinitions.length).toEqual(1);
    expect(globalTypeDefinitions[0].params).toEqual({
      phase: {
        innerPolicyField: {
          // the policy is now described recursively by its own global type, but that works in the autocomplete engine
          __scope_link: 'GLOBAL.test.namespace.policy',
        },
        phaseField: '',
      },
    });
  });
});
