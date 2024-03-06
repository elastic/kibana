/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sha256 } from './sha256';
import { createHash } from 'crypto';

describe('@kbn/crypto-browser', () => {
  test('sha256 equals built in sha256', async function () {
    const content = 'hello world';

    expect(await sha256(content)).toEqual(createHash('sha256').update(content).digest('hex'));
  });
});
