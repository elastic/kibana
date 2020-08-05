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

import { ErrorHandler } from './_error_handler';

describe('Vislib ErrorHandler Test Suite', function () {
  let errorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  describe('validateWidthandHeight Method', function () {
    it('should throw an error when width and/or height is 0', function () {
      expect(function () {
        errorHandler.validateWidthandHeight(0, 200);
      }).toThrow();
      expect(function () {
        errorHandler.validateWidthandHeight(200, 0);
      }).toThrow();
    });

    it('should throw an error when width and/or height is NaN', function () {
      expect(function () {
        errorHandler.validateWidthandHeight(null, 200);
      }).toThrow();
      expect(function () {
        errorHandler.validateWidthandHeight(200, null);
      }).toThrow();
    });
  });
});
