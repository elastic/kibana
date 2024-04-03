/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { esHitsMock } from '../__mocks__';
import { getDocId } from './get_doc_id';

describe('getDocId', () => {
  test('should return unique ID', () => {
    const result = getDocId(esHitsMock[0]);
    expect(result).toMatchInlineSnapshot(`"i::1::"`);
  });
});
