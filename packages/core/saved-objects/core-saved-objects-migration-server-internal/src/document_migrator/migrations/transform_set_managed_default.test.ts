/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transformSetManagedDefault } from './transform_set_managed_default';

describe('transformAddManaged', () => {
  it('should add managed if not defined', () => {
    expect(
      transformSetManagedDefault({
        id: 'a',
        attributes: {},
        type: 'something',
      })
    ).toHaveProperty('transformedDoc.managed');
  });
  it('should not change managed if already defined', () => {
    const docWithManagedFalse = transformSetManagedDefault({
      id: 'a',
      attributes: {},
      type: 'something',
      managed: false,
    });
    const docWithManagedTrue = transformSetManagedDefault({
      id: 'a',
      attributes: {},
      type: 'something',
      managed: true,
    });
    [docWithManagedFalse, docWithManagedTrue].forEach((doc) => {
      expect(doc.transformedDoc.managed).toBeDefined();
    });
    expect(docWithManagedFalse.transformedDoc.managed).not.toBeTruthy();
    expect(docWithManagedTrue.transformedDoc.managed).toBeTruthy();
  });
});
