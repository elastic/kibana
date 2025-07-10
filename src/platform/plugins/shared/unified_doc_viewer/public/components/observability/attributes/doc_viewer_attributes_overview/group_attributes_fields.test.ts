/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { groupAttributesFields } from './group_attributes_fields';

describe('groupAttributesFields', () => {
  const flattened = {
    'attributes.foo': 'bar',
    'resource.attributes.env': 'prod',
    'scope.attributes.lib': 'lib1',
    other: 'value',
  };

  const allFields = Object.keys(flattened);

  const alwaysShow = () => true;

  it('groups fields correctly', () => {
    const result = groupAttributesFields({
      allFields,
      flattened,
      searchTerm: '',
      shouldShowFieldHandler: alwaysShow,
      isEsqlMode: false,
      areNullValuesHidden: false,
    });

    expect(result.attributesFields).toEqual([{ name: 'attributes.foo', displayName: 'foo' }]);
    expect(result.resourceAttributesFields).toEqual([
      { name: 'resource.attributes.env', displayName: 'env' },
    ]);
    expect(result.scopeAttributesFields).toEqual([
      { name: 'scope.attributes.lib', displayName: 'lib' },
    ]);
  });

  it('filters by searchTerm', () => {
    const result = groupAttributesFields({
      allFields,
      flattened,
      searchTerm: 'env',
      shouldShowFieldHandler: alwaysShow,
      isEsqlMode: false,
      areNullValuesHidden: false,
    });

    expect(result.resourceAttributesFields).toEqual([
      { name: 'resource.attributes.env', displayName: 'env' },
    ]);
    expect(result.attributesFields).toEqual([]);
    expect(result.scopeAttributesFields).toEqual([]);
  });

  it('filters out null values in ES|QL mode', () => {
    const flattenedWithNull = { ...flattened, 'attributes.null': null };
    const allFieldsWithNull = Object.keys(flattenedWithNull);

    const result = groupAttributesFields({
      allFields: allFieldsWithNull,
      flattened: flattenedWithNull,
      searchTerm: '',
      shouldShowFieldHandler: alwaysShow,
      isEsqlMode: true,
      areNullValuesHidden: true,
    });

    expect(result.attributesFields).toEqual([{ name: 'attributes.foo', displayName: 'foo' }]);
  });
});
