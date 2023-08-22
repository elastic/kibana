/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isErrorResponse, isCompleteResponse, isRunningResponse } from './utils';

describe('utils', () => {
  describe('isErrorResponse', () => {
    it('returns `true` if the response is undefined', () => {
      const isError = isErrorResponse();
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

  describe('isRunningResponse', () => {
    it('returns `false` if the response is undefined', () => {
      const isRunning = isRunningResponse();
      expect(isRunning).toBe(false);
    });

    it('returns `true` if the response is running', () => {
      const isRunning = isRunningResponse({
        isRunning: true,
        rawResponse: {},
      });
      expect(isRunning).toBe(true);
    });

    it('returns `false` if the response is finished running', () => {
      const isRunning = isRunningResponse({
        isRunning: false,
        rawResponse: {},
      });
      expect(isRunning).toBe(false);
    });
  });
});
