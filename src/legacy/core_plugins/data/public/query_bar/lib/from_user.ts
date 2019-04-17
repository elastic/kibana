/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

/**
 * Take userInput from the user and make it into a query object
 * @returns {object}
 * @param userInput
 */

export function fromUser(userInput: object | string) {
  const matchAll = '';

  if (_.isObject(userInput)) {
    // If we get an empty object, treat it as a *
    if (!Object.keys(userInput).length) {
      return matchAll;
    }
    return userInput;
  }

  userInput = userInput || '';
  if (typeof userInput === 'string') {
    userInput = userInput.trim();
    if (userInput.length === 0) {
      return matchAll;
    }

    if (userInput[0] === '{') {
      try {
        return JSON.parse(userInput);
      } catch (e) {
        return userInput;
      }
    } else {
      return userInput;
    }
  }
}
