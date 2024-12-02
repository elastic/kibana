/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
/**
 * PLEASE NOTE:
 * Importing '@testing-library/react' registers an `afterEach(cleanup)` side effect.
 * It has tricky code that flushes pending promises, that previously led to unpredictable test failures
 * https://github.com/elastic/kibana/issues/59469
 * But since newer versions it has stabilised itself
 */
import { configure } from '@testing-library/react';

// instead of default 'data-testid', use kibana's 'data-test-subj'
configure({ testIdAttribute: 'data-test-subj', asyncUtilTimeout: 4500 });

/* eslint-env jest */

// This is a workaround to run tests with React 17 and the latest @testing-library/react
// Tracking issue to clean this up https://github.com/elastic/kibana/issues/199100
jest.mock('@testing-library/react', () => {
  const actual = jest.requireActual('@testing-library/react');

  return {
    ...actual,
    render: (ui, options) => actual.render(ui, { ...options, legacyRoot: true }),
    renderHook: (render, options) => actual.renderHook(render, { ...options, legacyRoot: true }),
  };
});

const consoleFilters = [
  /^The above error occurred in the <.*?> component:/, // error boundary output
  /^Error: Uncaught .+/, // jsdom output
];

// This is a workaround to run tests with React 17 and the latest @testing-library/react
// And prevent the act warnings that were supposed to be muted by @testing-library
// The testing library mutes the act warnings in some cases by setting IS_REACT_ACT_ENVIRONMENT which is React@18 feature https://github.com/testing-library/react-testing-library/pull/1137/
// Using this console override we're muting the act warnings as well
// Tracking issue to clean this up https://github.com/elastic/kibana/issues/199100
// NOTE: we're not muting all the act warnings but only those that testing-library wanted to mute
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args[0]?.toString();

  if (global.IS_REACT_ACT_ENVIRONMENT === false) {
    if (message.includes('Warning: An update to %s inside a test was not wrapped in act')) {
      return;
    }
  }

  // Additionally this is a restoration of the original console.error suppression
  // expected by the usage of renderHook from react-hooks-testing-library
  // which has been moved into latest react-testing-library but the suppression
  // of the console.error was not moved with it.
  //
  // So adding by example from the original implementation:
  // https://github.com/testing-library/react-hooks-testing-library/blob/1e01273374af4e48a0feb1f2233bf6c76d742167/src/core/console.ts
  // with a slight modification to catch non-string errors as well

  if (message && consoleFilters.some((filter) => filter.test(message))) {
    return;
  }

  originalConsoleError(...args);
};
