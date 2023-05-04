/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ActiveCursor } from './active_cursor';

describe('ActiveCursor', () => {
  let activeCursor: ActiveCursor;

  beforeEach(() => {
    activeCursor = new ActiveCursor();
  });

  test('should initialize activeCursor$ stream on setup hook', () => {
    expect(activeCursor.activeCursor$).toBeUndefined();

    activeCursor.setup();

    expect(activeCursor.activeCursor$).toMatchInlineSnapshot(`
      Subject {
        "closed": false,
        "currentObservers": null,
        "hasError": false,
        "isStopped": false,
        "observers": Array [],
        "thrownError": null,
      }
    `);
  });
});
