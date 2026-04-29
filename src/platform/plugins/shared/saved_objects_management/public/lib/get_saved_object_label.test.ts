/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectManagementTypeInfo } from '../../common/types';
import { getSavedObjectLabel } from './get_saved_object_label';

const toTypeInfo = (name: string, displayName?: string): SavedObjectManagementTypeInfo => ({
  name,
  displayName: displayName ?? name,
  hidden: false,
  namespaceType: 'single',
});

describe('getSavedObjectLabel', () => {
  it('returns the type name if no types are provided', () => {
    expect(getSavedObjectLabel('foo', [])).toEqual('foo');
  });

  it('returns the type name if type does not specify a display name', () => {
    expect(getSavedObjectLabel('foo', [toTypeInfo('foo')])).toEqual('foo');
  });

  it('returns the type display name if type does specify a display name', () => {
    expect(getSavedObjectLabel('foo', [toTypeInfo('foo', 'fooDisplay')])).toEqual('fooDisplay');
  });
});
