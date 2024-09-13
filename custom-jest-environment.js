/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const JSDOMEnvironment = require('jest-environment-jsdom');
const { screen } = require('@testing-library/react');

class CustomEnvironment extends JSDOMEnvironment {
  async handleTestEvent(event, state) {
    if (event.name === 'test_fn_failure') {
      const error = event.test.errors[0];
      if (error && error.message && error.message.includes('Timed out')) {
        console.log('Timeout error detected. Current screen state:');
        screen.debug();
      }
    }
    await super.handleTestEvent(event, state);
  }
}

module.exports = CustomEnvironment;
