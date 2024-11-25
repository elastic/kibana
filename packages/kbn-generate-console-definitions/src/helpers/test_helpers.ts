/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SpecificationTypes } from '../types';

export const mockRequestType: SpecificationTypes.Request = {
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

export const mockSchema: SpecificationTypes.Model = {
  endpoints: [],
  types: [],
};
