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

import { isErrorResponse, isCompleteResponse, isPartialResponse } from './utils';

describe('utils', () => {
  describe('isErrorResponse', () => {
    it('returns `true` if the response is undefined', () => {
      const isError = isErrorResponse();
      expect(isError).toBe(true);
    });

    it('returns `true` if the response is not running and partial', () => {
      const isError = isErrorResponse({
        isPartial: true,
        isRunning: false,
        rawResponse: {},
      });
      expect(isError).toBe(true);
    });

    it('returns `false` if the response is running and partial', () => {
      const isError = isErrorResponse({
        isPartial: true,
        isRunning: true,
        rawResponse: {},
      });
      expect(isError).toBe(false);
    });

    it('returns `false` if the response is complete', () => {
      const isError = isErrorResponse({
        isPartial: false,
        isRunning: false,
        rawResponse: {},
      });
      expect(isError).toBe(false);
    });
  });

  describe('isCompleteResponse', () => {
    it('returns `false` if the response is undefined', () => {
      const isError = isCompleteResponse();
      expect(isError).toBe(false);
    });

    it('returns `false` if the response is running and partial', () => {
      const isError = isCompleteResponse({
        isPartial: true,
        isRunning: true,
        rawResponse: {},
      });
      expect(isError).toBe(false);
    });

    it('returns `true` if the response is complete', () => {
      const isError = isCompleteResponse({
        isPartial: false,
        isRunning: false,
        rawResponse: {},
      });
      expect(isError).toBe(true);
    });
  });

  describe('isPartialResponse', () => {
    it('returns `false` if the response is undefined', () => {
      const isError = isPartialResponse();
      expect(isError).toBe(false);
    });

    it('returns `true` if the response is running and partial', () => {
      const isError = isPartialResponse({
        isPartial: true,
        isRunning: true,
        rawResponse: {},
      });
      expect(isError).toBe(true);
    });

    it('returns `false` if the response is complete', () => {
      const isError = isPartialResponse({
        isPartial: false,
        isRunning: false,
        rawResponse: {},
      });
      expect(isError).toBe(false);
    });
  });
});
