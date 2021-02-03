/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { expectAssignable } from 'tsd';
import { UnionToIntersection } from '../index';

type INTERSECTED = UnionToIntersection<{ foo: 'bar' } | { baz: 'qux' }>;

expectAssignable<INTERSECTED>({
  foo: 'bar',
  baz: 'qux',
});
