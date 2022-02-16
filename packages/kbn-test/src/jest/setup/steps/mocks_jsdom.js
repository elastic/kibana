/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-env jest */

/**
 * READ THIS BEFORE ADDING NEW MOCKS TO THIS FILE!
 *
 * This file should be loaded via `setupFilesAfterEnv` in all jest configs of the project.
 * It instantiates some of the very basic mocks that should be available in all jest tests.
 * Most of the mocks should just be instantiated in the test suites that require them.
 * We only activate a very rare amount of mocks here, that are used somewhere down the dependency
 * tree in nearly every test and their implementation is never working without mocking in any tests.
 * Before adding a mock here it should be considered, whether it's not better to instantiate that mock
 * in the test suites that needs them individually and if it's really needed to have that mock enabled
 * for all jest tests by default.
 *
 * The mocks that are enabled that way live inside the `__mocks__` folders beside their implementation files.
 */

jest.mock('@elastic/eui/lib/services/react', () => {
  // `enqueueStateChange` is an EUI method to batch queued functions that trigger React `setState` calls.
  // This is for performance, but when used in certain Jest scernarios it can be nondeterministic.
  // Jest tests are never concerned about the state prior to batch completion, so we bypass batching entirely.
  return {
    enqueueStateChange: (fn) => fn(),
  };
});
