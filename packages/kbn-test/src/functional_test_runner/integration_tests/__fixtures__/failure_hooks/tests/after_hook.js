/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default function () {
  describe('failing after hook', () => {
    it('stub test', () => {});
    after('$FAILING_AFTER_HOOK$', () => {
      throw new Error('$FAILING_AFTER_ERROR$');
    });
  });
}
