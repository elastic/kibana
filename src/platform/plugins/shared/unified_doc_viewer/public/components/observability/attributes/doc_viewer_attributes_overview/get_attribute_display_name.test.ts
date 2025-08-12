/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAttributeDisplayName } from './get_attribute_display_name';

describe('getAttributeDisplayName', () => {
  it('removes "attributes." prefix', () => {
    expect(getAttributeDisplayName('attributes.foo')).toBe('foo');
  });

  it('removes "resource.attributes." prefix', () => {
    expect(getAttributeDisplayName('resource.attributes.env')).toBe('env');
  });

  it('removes "scope.attributes." prefix', () => {
    expect(getAttributeDisplayName('scope.attributes.lib')).toBe('lib');
  });

  it('returns the original name if no prefix matches', () => {
    expect(getAttributeDisplayName('other')).toBe('other');
    expect(getAttributeDisplayName('attributesfoo')).toBe('attributesfoo');
  });
});
