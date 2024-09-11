/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validatePersistData } from './validate_persist_data';

describe('validatePersistData', () => {
  const TEST_PAGE_SIZE_OPTIONS = [50, 100];

  const TEST_VALID_DATA = {
    pageSize: 50,
    sort: {
      field: 'name',
      direction: 'asc',
    },
  };

  it('returns valid data', () => {
    expect(validatePersistData(TEST_VALID_DATA, TEST_PAGE_SIZE_OPTIONS)).toEqual(TEST_VALID_DATA);
  });

  it('returns valid data when pageSize is undefined', () => {
    const data = {
      sort: {
        field: 'name',
        direction: 'asc',
      },
    };

    expect(validatePersistData(data, TEST_PAGE_SIZE_OPTIONS)).toEqual(data);
  });

  it('returns valid data when sort is undefined', () => {
    const data = {
      pageSize: 100,
    };

    expect(validatePersistData(data, TEST_PAGE_SIZE_OPTIONS)).toEqual(data);
  });

  it('returns valid data when provided data is not object', () => {
    expect(validatePersistData('test', TEST_PAGE_SIZE_OPTIONS)).toEqual({});
  });

  it('returns valid data when provided data contains invalid properties', () => {
    const data = {
      foo: 'bar',
    };

    expect(validatePersistData(data, TEST_PAGE_SIZE_OPTIONS)).toEqual({});
  });

  it('returns valid data when provided data is undefined', () => {
    expect(validatePersistData(undefined, TEST_PAGE_SIZE_OPTIONS)).toEqual({});
  });

  describe('pageSize validation', () => {
    it("does not accept pageSize if it's not of type number", () => {
      const data = {
        pageSize: 'test',
        sort: TEST_VALID_DATA.sort,
      };

      expect(validatePersistData(data, TEST_PAGE_SIZE_OPTIONS)).toEqual({
        sort: TEST_VALID_DATA.sort,
      });
    });

    it("does not accept pageSize if it's not one of the available options", () => {
      const data = {
        pageSize: 3,
        sort: TEST_VALID_DATA.sort,
      };

      expect(validatePersistData(data, TEST_PAGE_SIZE_OPTIONS)).toEqual({
        sort: TEST_VALID_DATA.sort,
      });
    });
  });

  describe('sort validation', () => {
    it("does not accept sort if it doesn't contain direction property", () => {
      const data = {
        pageSize: TEST_VALID_DATA.pageSize,
        sort: {
          field: 'name',
        },
      };

      expect(validatePersistData(data, TEST_PAGE_SIZE_OPTIONS)).toEqual({
        pageSize: TEST_VALID_DATA.pageSize,
      });
    });

    it("does not accept sort if it doesn't contain field property", () => {
      const data = {
        pageSize: TEST_VALID_DATA.pageSize,
        sort: {
          direction: 'asc',
        },
      };

      expect(validatePersistData(data, TEST_PAGE_SIZE_OPTIONS)).toEqual({
        pageSize: TEST_VALID_DATA.pageSize,
      });
    });

    it('does not accept sort if its field property is not of type string, number, or symbol', () => {
      const data = {
        pageSize: TEST_VALID_DATA.pageSize,
        sort: {
          field: false,
          direction: 'asc',
        },
      };

      expect(validatePersistData(data, TEST_PAGE_SIZE_OPTIONS)).toEqual({
        pageSize: TEST_VALID_DATA.pageSize,
      });
    });

    it('does not accept sort if its direction property is not `asc` or `desc`', () => {
      const data = {
        pageSize: TEST_VALID_DATA.pageSize,
        sort: {
          field: 'name',
          direction: 'test',
        },
      };

      expect(validatePersistData(data, TEST_PAGE_SIZE_OPTIONS)).toEqual({
        pageSize: TEST_VALID_DATA.pageSize,
      });
    });
  });
});
