/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SpecificationTypes as S } from '../src/types';

export const mockRequestType: S.Request = {
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

export const getMockProperty = ({
  propertyName,
  typeName,
  serverDefault,
  type,
}: {
  propertyName: string;
  typeName?: S.TypeName;
  serverDefault?: S.Property['serverDefault'];
  type?: S.ValueOf;
}): S.Property => {
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

export const mockStringProperty = getMockProperty({
  propertyName: 'stringProperty',
  typeName: { name: 'string', namespace: '_builtins' },
});
export const mockNumberProperty = getMockProperty({
  propertyName: 'numberProperty',
  typeName: { name: 'number', namespace: '_builtins' },
});
export const mockBooleanProperty = getMockProperty({
  propertyName: 'booleanProperty',
  typeName: { name: 'boolean', namespace: '_builtins' },
});

export const mockSchema: S.Model = {
  endpoints: [],
  types: [],
};
