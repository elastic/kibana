/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getPath } from './utils';
import { DataViewField, DataView } from '@kbn/data-views-plugin/public';

test('getPath() should encode "fieldName"', () => {
  expect(
    getPath(
      { name: 'Memory: Allocated Bytes/sec' } as unknown as DataViewField,
      { id: 'id' } as unknown as DataView
    )
  ).toMatchInlineSnapshot(`"/dataView/id/field/Memory%3A%20Allocated%20Bytes%2Fsec"`);
});
