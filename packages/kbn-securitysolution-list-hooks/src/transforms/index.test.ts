/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CreateExceptionListItemSchema,
  Entry,
  EntryMatch,
  EntryNested,
  ExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  addIdToExceptionItemEntries,
  removeIdFromExceptionItemsEntries,
  transformInput,
  transformOutput,
} from '../..';

import { getCreateExceptionListItemSchemaMock } from '../mocks/request/create_exception_list_item_schema.mock';
import { getUpdateExceptionListItemSchemaMock } from '../mocks/request/update_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '../mocks/response/exception_list_item_schema.mock';
import { COMMENTS_WITH_CREATEDAT_CREATEDBY, ENTRIES_WITH_IDS } from '../mocks/constants.mock';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('123'),
}));

describe('Exceptions transforms', () => {
  describe('transformOutput', () => {
    it('should return same output as input with stripped ids per entry - CreateExceptionListItemSchema', () => {
      const mockCreateExceptionItem = {
        ...getCreateExceptionListItemSchemaMock(),
        entries: ENTRIES_WITH_IDS,
      };
      const output = transformOutput(mockCreateExceptionItem);
      const expectedOutput: CreateExceptionListItemSchema = getCreateExceptionListItemSchemaMock();

      expect(output).toEqual(expectedOutput);
    });

    it('should return same output as input with stripped ids per entry - UpdateExceptionListItemSchema', () => {
      const mockUpdateExceptionItem = {
        ...getUpdateExceptionListItemSchemaMock(),
        entries: ENTRIES_WITH_IDS,
      };
      const output = transformOutput(mockUpdateExceptionItem);
      const expectedOutput: UpdateExceptionListItemSchema = getUpdateExceptionListItemSchemaMock();

      expect(output).toEqual(expectedOutput);
    });
    it('should return output as input with stripped createdAt and createdBy per entry - UpdateExceptionListItemSchema', () => {
      const mockUpdateExceptionItem = {
        ...getUpdateExceptionListItemSchemaMock(),
        entries: ENTRIES_WITH_IDS,
        comments: COMMENTS_WITH_CREATEDAT_CREATEDBY,
      };
      const output = transformOutput(mockUpdateExceptionItem);
      const expectedOutput: UpdateExceptionListItemSchema = getUpdateExceptionListItemSchemaMock();

      expect(output).toEqual(expectedOutput);
    });
  });

  describe('transformInput', () => {
    it('should return same output as input with added ids per entry', () => {
      const mockExceptionItem = getExceptionListItemSchemaMock();
      const output = transformInput(mockExceptionItem);
      const expectedOutput: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: ENTRIES_WITH_IDS,
      };

      expect(output).toEqual(expectedOutput);
    });
  });

  describe('addIdToExceptionItemEntries', () => {
    it('should return same output as input with added ids per entry', () => {
      const mockExceptionItem: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'match',
            value: 'some value',
          },
        ],
      };
      const output = addIdToExceptionItemEntries(mockExceptionItem);
      const expectedOutput: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            id: '123',
            operator: 'included',
            type: 'match',
            value: 'some value',
          } as Entry & { id: string },
        ],
      };

      expect(output).toEqual(expectedOutput);
    });

    it('should return same output as input with added ids per nested entry', () => {
      const mockExceptionItem: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                operator: 'included',
                type: 'match',
                value: 'some value',
              },
            ],
            field: 'some.parentField',
            type: 'nested',
          },
        ],
      };
      const output = addIdToExceptionItemEntries(mockExceptionItem);
      const expectedOutput: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                id: '123',
                operator: 'included',
                type: 'match',
                value: 'some value',
              } as EntryMatch & { id: string },
            ],
            field: 'some.parentField',
            id: '123',
            type: 'nested',
          } as EntryNested & { id: string },
        ],
      };

      expect(output).toEqual(expectedOutput);
    });
  });

  describe('removeIdFromExceptionItemsEntries', () => {
    it('should return same output as input with stripped ids per entry - CreateExceptionListItemSchema', () => {
      const mockCreateExceptionItem = {
        ...getCreateExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            id: '123',
            operator: 'included',
            type: 'match',
            value: 'some value',
          } as Entry & { id: string },
        ],
      };
      const output = removeIdFromExceptionItemsEntries(mockCreateExceptionItem);
      const expectedOutput: CreateExceptionListItemSchema = {
        ...getCreateExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'match',
            value: 'some value',
          },
        ],
      };

      expect(output).toEqual(expectedOutput);
    });

    it('should return same output as input with stripped ids per nested entry - CreateExceptionListItemSchema', () => {
      const mockCreateExceptionItem = {
        ...getCreateExceptionListItemSchemaMock(),
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                id: '123',
                operator: 'included',
                type: 'match',
                value: 'some value',
              } as EntryMatch & { id: string },
            ],
            field: 'some.parentField',
            id: '123',
            type: 'nested',
          } as EntryNested & { id: string },
        ],
      };
      const output = removeIdFromExceptionItemsEntries(mockCreateExceptionItem);
      const expectedOutput: CreateExceptionListItemSchema = {
        ...getCreateExceptionListItemSchemaMock(),
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                operator: 'included',
                type: 'match',
                value: 'some value',
              },
            ],
            field: 'some.parentField',
            type: 'nested',
          },
        ],
      };

      expect(output).toEqual(expectedOutput);
    });

    it('should return same output as input with stripped ids per entry - UpdateExceptionListItemSchema', () => {
      const mockUpdateExceptionItem = {
        ...getUpdateExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            id: '123',
            operator: 'included',
            type: 'match',
            value: 'some value',
          } as Entry & { id: string },
        ],
      };
      const output = removeIdFromExceptionItemsEntries(mockUpdateExceptionItem);
      const expectedOutput: UpdateExceptionListItemSchema = {
        ...getUpdateExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'match',
            value: 'some value',
          },
        ],
      };

      expect(output).toEqual(expectedOutput);
    });

    it('should return same output as input with stripped ids per nested entry - UpdateExceptionListItemSchema', () => {
      const mockUpdateExceptionItem = {
        ...getUpdateExceptionListItemSchemaMock(),
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                id: '123',
                operator: 'included',
                type: 'match',
                value: 'some value',
              } as EntryMatch & { id: string },
            ],
            field: 'some.parentField',
            id: '123',
            type: 'nested',
          } as EntryNested & { id: string },
        ],
      };
      const output = removeIdFromExceptionItemsEntries(mockUpdateExceptionItem);
      const expectedOutput: UpdateExceptionListItemSchema = {
        ...getUpdateExceptionListItemSchemaMock(),
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                operator: 'included',
                type: 'match',
                value: 'some value',
              },
            ],
            field: 'some.parentField',
            type: 'nested',
          },
        ],
      };

      expect(output).toEqual(expectedOutput);
    });
  });
});
