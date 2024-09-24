/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SpecificationTypes } from './types';
import { generateQueryParams } from './generate_query_params';
import { getMockProperty, mockRequestType, mockSchema } from './helpers/test_helpers';

describe('generateQueryParams', () => {
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
});
