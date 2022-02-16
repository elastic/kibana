/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-env jest */

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
