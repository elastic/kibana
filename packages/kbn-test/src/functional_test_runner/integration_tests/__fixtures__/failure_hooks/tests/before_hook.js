/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default function () {
  describe('failing before hook', () => {
    before('$FAILING_BEFORE_HOOK$', () => {
      throw new Error('$FAILING_BEFORE_ERROR$');
    });

    it('stub test', () => {});
  });
}
