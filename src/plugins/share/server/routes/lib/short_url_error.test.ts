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
import { handleShortUrlError } from './short_url_error';
import Boom from 'boom';

function createErrorWithStatusCode(statusCode: number) {
  return new Boom('', { statusCode });
}

describe('handleShortUrlError()', () => {
  const caughtErrorsWithStatusCode = [
    createErrorWithStatusCode(401),
    createErrorWithStatusCode(403),
    createErrorWithStatusCode(404),
  ];

  const uncaughtErrors = [new Error(), createErrorWithStatusCode(500)];

  caughtErrorsWithStatusCode.forEach(err => {
    const statusCode = (err as Boom).output.statusCode;
    it(`should handle errors with statusCode of ${statusCode}`, function() {
      expect(_.get(handleShortUrlError(err), 'output.statusCode')).toBe(statusCode);
    });
  });

  uncaughtErrors.forEach(err => {
    it(`should not handle unknown errors`, function() {
      expect(_.get(handleShortUrlError(err), 'output.statusCode')).toBe(500);
    });
  });
});
