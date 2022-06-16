/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSessionId } from './get_session_id';

describe('getSessionId', () => {
  test('should return a session id', () => {
    const sessionId = getSessionId();
    expect(sessionId).toStrictEqual(expect.any(String));
  });

  test('calling it twice should return the same value', () => {
    const sessionId1 = getSessionId();
    const sessionId2 = getSessionId();
    expect(sessionId2).toStrictEqual(sessionId1);
  });
});
