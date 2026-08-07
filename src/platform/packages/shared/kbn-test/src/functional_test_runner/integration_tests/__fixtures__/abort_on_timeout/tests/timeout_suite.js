/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export default function () {
  describe('abort on timeout suite', () => {
    // never resolves, so Mocha times out after mochaOpts.timeout
    it('$HANGING_TEST$', () => new Promise(() => {}));

    it('$SHOULD_NOT_RUN$', () => {
      console.log('$SHOULD_NOT_RUN_RAN$');
    });

    // never resolves; would hang for the full hookTimeout without the abort's fast-fail
    after('$SLOW_AFTER_ALL_HOOK$', () => new Promise(() => {}));
  });
}
