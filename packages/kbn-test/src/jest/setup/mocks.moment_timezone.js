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

jest.mock('moment-timezone', () => {
  // We always want to mock the timezone moment-timezone guesses, since otherwise
  // test results might be depending on which time zone you are running them.
  // Using that mock we always make sure moment.tz.guess is always returning the same
  // timezone in all tests.
  const moment = jest.requireActual('moment-timezone');
  moment.tz.guess = () => 'America/New_York';
  moment.tz.setDefault('America/New_York');
  return moment;
});
