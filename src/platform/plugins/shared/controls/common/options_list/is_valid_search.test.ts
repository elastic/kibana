/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidSearch } from './is_valid_search';

describe('test validity of search strings', () => {
  describe('number field', () => {
    it('valid search - basic integer', () => {
      expect(isValidSearch({ searchString: '123', fieldType: 'number' })).toBe(true);
    });

    it('valid search - floating point number', () => {
      expect(isValidSearch({ searchString: '12.34', fieldType: 'number' })).toBe(true);
    });

    it('valid search - negative number', () => {
      expect(isValidSearch({ searchString: '-42', fieldType: 'number' })).toBe(true);
    });

    it('invalid search - invalid character search string', () => {
      expect(isValidSearch({ searchString: '1!a23', fieldType: 'number' })).toBe(false);
    });
  });

  // we do not currently support searching date fields, so they will always be invalid
  describe('date field', () => {
    it('invalid search - formatted date', () => {
      expect(isValidSearch({ searchString: 'December 12, 2023', fieldType: 'date' })).toBe(false);
    });

    it('invalid search - invalid character search string', () => {
      expect(isValidSearch({ searchString: '!!12/12/23?', fieldType: 'date' })).toBe(false);
    });
  });

  // only testing exact match validity here - the remainder of testing is covered by ./ip_search.test.ts
  describe('ip field', () => {
    it('valid search - ipv4', () => {
      expect(
        isValidSearch({
          searchString: '1.2.3.4',
          fieldType: 'ip',
          searchTechnique: 'exact',
        })
      ).toBe(true);
    });

    it('valid search - full ipv6', () => {
      expect(
        isValidSearch({
          searchString: 'fbbe:a363:9e14:987c:49cf:d4d0:d8c8:bc42',
          fieldType: 'ip',
          searchTechnique: 'exact',
        })
      ).toBe(true);
    });

    it('valid search - partial ipv6', () => {
      expect(
        isValidSearch({
          searchString: 'fbbe:a363::',
          fieldType: 'ip',
          searchTechnique: 'exact',
        })
      ).toBe(true);
    });

    it('invalid search - invalid character search string', () => {
      expect(
        isValidSearch({
          searchString: '!!123.abc?',
          fieldType: 'ip',
          searchTechnique: 'exact',
        })
      ).toBe(false);
    });

    it('invalid search - ipv4', () => {
      expect(
        isValidSearch({
          searchString: '1.2.3.256',
          fieldType: 'ip',
          searchTechnique: 'exact',
        })
      ).toBe(false);
    });

    it('invalid search - ipv6', () => {
      expect(
        isValidSearch({
          searchString: '::fbbe:a363::',
          fieldType: 'ip',
          searchTechnique: 'exact',
        })
      ).toBe(false);
    });
  });

  // string field searches can never be invalid
  describe('string field', () => {
    it('valid search - basic search string', () => {
      expect(isValidSearch({ searchString: 'abc', fieldType: 'string' })).toBe(true);
    });

    it('valid search - numeric search string', () => {
      expect(isValidSearch({ searchString: '123', fieldType: 'string' })).toBe(true);
    });

    it('valid search - complex search string', () => {
      expect(isValidSearch({ searchString: '!+@abc*&[]', fieldType: 'string' })).toBe(true);
    });
  });
});
