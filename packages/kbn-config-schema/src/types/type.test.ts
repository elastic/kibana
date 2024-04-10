/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { internals } from '../internals';
import { Type, TypeOptions } from './type';

class MyType extends Type<any> {
  constructor(opts: TypeOptions<any> = {}) {
    super(internals.any(), opts);
  }
}

test('describe', () => {
  const type = new MyType({ description: 'my description' });
  const meta = type.getSchema().describe();
  expect(get(meta, 'flags.description')).toBe('my description');
});
