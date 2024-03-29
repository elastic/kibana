/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

/**
 * Take userInput from the user and make it into a query object
 * @returns {object}
 * @param userInput
 */

export function fromUser(userInput: object | string) {
  const matchAll = '';

  if (_.isEmpty(userInput)) {
    return '';
  }

  if (_.isObject(userInput)) {
    return userInput;
  }

  userInput = userInput || '';
  if (typeof userInput === 'string') {
    const trimmedUserInput = userInput.trim();
    if (trimmedUserInput.length === 0) {
      return matchAll;
    }

    if (trimmedUserInput[0] === '{') {
      try {
        return JSON.parse(trimmedUserInput);
      } catch (e) {
        return userInput;
      }
    } else {
      return userInput;
    }
  }
}
