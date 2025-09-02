/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformReferencesOut } from './transform_references_out';

describe('transformReferencesOut', () => {
  test('should not transform non-legacy saved object references', () => {
    const references = [
      {
        name: 'someRef',
        type: 'someType',
        id: '1',
      },
    ];
    expect(transformReferencesOut(references)).toEqual(references);
  });

  test('should transform legacy saved object references', () => {
    const references = [
      {
        name: 'panel_4',
        type: 'someType',
        id: '1',
      },
    ];
    expect(transformReferencesOut(references)).toEqual([
      {
        name: '4:savedObjectRef',
        type: 'someType',
        id: '1',
      },
    ]);
  });

  test('should transform legacy saved object references prefixed by panel id', () => {
    const references = [
      {
        name: '4:panel_4',
        type: 'someType',
        id: '1',
      },
    ];
    expect(transformReferencesOut(references)).toEqual([
      {
        name: '4:savedObjectRef',
        type: 'someType',
        id: '1',
      },
    ]);
  });
});
