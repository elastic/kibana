/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sha1 } from './sha1_rusha';
import { createHash } from 'crypto';

describe('Rusha package', () => {
  test('sha1 equals built in sha1', async function () {
    const content = 'hello world';

    expect(await sha1(content)).toEqual(createHash('sha1').update(content).digest('hex'));
  });
});
