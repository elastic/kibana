/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { unary } from 'lodash';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { transformSetManagedDefault } from './transform_set_managed_default';

const transform = unary(SavedObjectsUtils.getMigrationFunction(transformSetManagedDefault));

describe('transformAddManaged', () => {
  it('should add managed if not defined', () => {
    expect(
      transform({
        id: 'a',
        attributes: {},
        type: 'something',
      })
    ).toHaveProperty('managed');
  });
  it('should not change managed if already defined', () => {
    const docWithManagedFalse = transform({
      id: 'a',
      attributes: {},
      type: 'something',
      managed: false,
    });
    const docWithManagedTrue = transform({
      id: 'a',
      attributes: {},
      type: 'something',
      managed: true,
    });
    [docWithManagedFalse, docWithManagedTrue].forEach((doc) => {
      expect(doc.managed).toBeDefined();
    });
    expect(docWithManagedFalse.managed).not.toBeTruthy();
    expect(docWithManagedTrue.managed).toBeTruthy();
  });
});
