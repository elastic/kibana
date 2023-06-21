/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { generateShareToken } from './generate_share_token';

describe('generateShareToken', () => {
  it('should contain only expected chars of a given length', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateShareToken()).toMatch(/^[a-zA-O0-9]{40}$/);
    }
  });
});
