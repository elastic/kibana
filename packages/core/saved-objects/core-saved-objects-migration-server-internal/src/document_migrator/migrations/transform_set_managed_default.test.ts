/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transformSetManagedDefault } from './transform_set_managed_default';

describe('transformAddManaged', () => {
  it('should add the managed property if not defined', () => {
    expect(
      transformSetManagedDefault({
        id: 'a',
        attributes: {},
        type: 'something',
      })
    ).toHaveProperty('transformedDoc.managed');
  });
  it('should not change the managed property if defined', () => {
    const docWithManaged = transformSetManagedDefault({
      id: 'a',
      attributes: {},
      type: 'something',
      managed: false,
    });
    expect(docWithManaged.transformedDoc.managed).toBeDefined();
  });
});
