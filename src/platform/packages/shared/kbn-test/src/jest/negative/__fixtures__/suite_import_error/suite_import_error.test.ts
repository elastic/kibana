/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './this_module_does_not_exist';

// Canary: the suite fails to load because of an unresolvable import, before any
// assertion runs. The runner must report the suite-load failure.
describe('negative canary: suite import error', () => {
  it('never runs because the import above fails', () => {
    expect(true).toBe(true);
  });
});
