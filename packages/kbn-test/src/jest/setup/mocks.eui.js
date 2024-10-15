/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-env jest */

jest.mock('@elastic/eui/lib/services/react', () => {
  // `enqueueStateChange` is an EUI method to batch queued functions that trigger React `setState` calls.
  // This is for performance, but when used in certain Jest scernarios it can be nondeterministic.
  // Jest tests are never concerned about the state prior to batch completion, so we bypass batching entirely.
  return {
    enqueueStateChange: (fn) => fn(),
  };
});
