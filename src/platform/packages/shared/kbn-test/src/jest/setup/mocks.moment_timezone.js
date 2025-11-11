/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

let mockIsInitializingMoment = false;

const setMomentTimezone = () => {
  const momentTz = jest.requireActual('moment-timezone');
  momentTz.tz.guess = () => 'America/New_York';
  momentTz.tz.setDefault('America/New_York');
  return momentTz;
};

jest.mock('moment-timezone', () => {
  // We always want to mock the timezone moment-timezone guesses, since otherwise
  // test results might be depending on which time zone you are running them.
  // Using that mock we always make sure moment.tz.guess is always returning the same
  // timezone in all tests.
  return setMomentTimezone();
});

// Also mock 'moment' to ensure timezone is set even when code imports 'moment' directly
// This is needed because the lazy-require plugin may load 'moment' before 'moment-timezone'
jest.mock('moment', () => {
  const moment = jest.requireActual('moment');

  if (mockIsInitializingMoment) {
    // We're in a circular dependency - moment-timezone is requiring moment
    // Return the actual moment to break the cycle
    return moment;
  }

  mockIsInitializingMoment = true;
  try {
    setMomentTimezone();

    return moment;
  } finally {
    mockIsInitializingMoment = false;
  }
});
