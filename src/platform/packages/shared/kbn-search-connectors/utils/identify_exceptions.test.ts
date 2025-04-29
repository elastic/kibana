/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isIndexNotFoundException, isResourceAlreadyExistsException } from './identify_exceptions';

describe('IdentifyExceptions', () => {
  describe('IsIndexNotFoundException', () => {
    it('should return true for index not found exception', () => {
      const error = {
        meta: {
          body: {
            error: {
              type: 'index_not_found_exception',
            },
            status: 404,
          },
          name: 'ResponseError',
          statusCode: 404,
        },
      };
      expect(isIndexNotFoundException(error as any)).toEqual(true);
    });
    it('should return false for other exception', () => {
      const error = {
        meta: {
          body: {
            error: {
              type: 'other_exception',
            },
            status: 404,
          },
          name: 'ResponseError',
          statusCode: 404,
        },
      };
      expect(isIndexNotFoundException(error as any)).toEqual(false);
    });
    it('should return false for other object', () => {
      expect(isIndexNotFoundException({} as any)).toEqual(false);
    });
  });
  describe('isResourceAlreadyExistsError', () => {
    it('should return true for resource already exists exception', () => {
      const error = {
        meta: {
          body: {
            error: {
              type: 'resource_already_exists_exception',
            },
            status: 400,
          },
          name: 'ResponseError',
          statusCode: 400,
        },
      };
      expect(isResourceAlreadyExistsException(error as any)).toEqual(true);
    });
    it('should return false for other exception', () => {
      const error = {
        meta: {
          body: {
            error: {
              type: 'other_exception',
            },
            status: 404,
          },
          name: 'ResponseError',
          statusCode: 404,
        },
      };
      expect(isResourceAlreadyExistsException(error as any)).toEqual(false);
    });
    it('should return false for other object', () => {
      expect(isResourceAlreadyExistsException({} as any)).toEqual(false);
    });
  });
});
