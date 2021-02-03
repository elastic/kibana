/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
