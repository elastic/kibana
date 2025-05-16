/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PRODUCT_ORIGIN_HEADER } from '@kbn/core-elasticsearch-client-server-internal';
import { getReservedHeaders } from './default_headers';

describe('getReservedHeaders', () => {
  it('returns the list of reserved headers contained in a list', () => {
    expect(getReservedHeaders(['foo', 'bar', PRODUCT_ORIGIN_HEADER])).toEqual([
      PRODUCT_ORIGIN_HEADER,
    ]);
  });

  it('ignores the case when identifying headers', () => {
    expect(getReservedHeaders(['foo', 'bar', PRODUCT_ORIGIN_HEADER.toUpperCase()])).toEqual([
      PRODUCT_ORIGIN_HEADER.toUpperCase(),
    ]);
  });
});
