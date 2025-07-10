/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterManager } from '@kbn/data-plugin/public';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { createFilterOutActionFactory } from './filter_out';
import { makeActionContext } from '../../mocks/helpers';
import type { NotificationsStart } from '@kbn/core-notifications-browser';

const mockFilterManager = { addFilters: jest.fn() } as unknown as FilterManager;

const mockCreateFilter = jest.fn((_: unknown) => ({}));
jest.mock('./create_filter', () => ({
  ...jest.requireActual('./create_filter'),
  createFilter: (params: unknown) => mockCreateFilter(params),
}));

const fieldName = 'user.name';
const value = 'the value';
const dataViewId = 'mockDataViewId';

const mockWarningToast = jest.fn();

describe('createFilterOutAction', () => {
  const filterOutActionFactory = createFilterOutActionFactory({
    filterManager: mockFilterManager,
    notifications: { toasts: { addWarning: mockWarningToast } } as unknown as NotificationsStart,
  });
  const filterOutAction = filterOutActionFactory({ id: 'testAction' });
  const context = makeActionContext({
    data: [
      {
        field: { name: fieldName, type: 'string', searchable: true, aggregatable: true },
        value,
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(filterOutAction.getDisplayName(context)).toEqual('Filter out');
  });

  it('should return icon type', () => {
    expect(filterOutAction.getIconType(context)).toEqual('minusInCircle');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await filterOutAction.isCompatible(context)).toEqual(true);
    });

    it('should return false if field.name not valid', async () => {
      expect(
        await filterOutAction.isCompatible({
          ...context,
          data: [
            {
              field: { ...context.data[0].field, name: '' },
            },
          ],
        })
      ).toEqual(false);
    });

    it('should return false if Kbn type is unsupported', async () => {
      expect(
        await filterOutAction.isCompatible({
          ...context,
          data: [
            {
              ...context.data[0],
              field: { ...context.data[0].field, type: KBN_FIELD_TYPES._SOURCE },
            },
          ],
        })
      ).toEqual(false);
    });
  });

  describe('execute', () => {
    it('should add the filter to filterManager', async () => {
      await filterOutAction.execute(context);
      expect(mockFilterManager.addFilters).toHaveBeenCalled();
    });

    it('should create negate filter query with value', async () => {
      await filterOutAction.execute(context);
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [value],
        negate: true,
        dataViewId,
      });
    });

    it('should create negate filter query with array value', async () => {
      await filterOutAction.execute({
        ...context,
        data: [
          {
            field: { ...context.data[0].field },
            value: [value],
          },
        ],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [value],
        negate: true,
        dataViewId,
      });
    });

    it('should create filter query with null value', async () => {
      await filterOutAction.execute({
        ...context,
        data: [
          {
            field: { ...context.data[0].field },
            value: null,
          },
        ],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [],
        negate: false,
        dataViewId,
      });
    });

    it('should create filter query with undefined value', async () => {
      await filterOutAction.execute({
        ...context,
        data: [
          {
            field: { ...context.data[0].field },
            value: undefined,
          },
        ],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [],
        negate: false,
        dataViewId,
      });
    });

    it('should create negate filter query with empty string value', async () => {
      await filterOutAction.execute({
        ...context,
        data: [
          {
            field: { ...context.data[0].field },
            value: '',
          },
        ],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [''],
        negate: false,
        dataViewId,
      });
    });

    it('should create negate filter query with empty array value', async () => {
      await filterOutAction.execute({
        ...context,
        data: [
          {
            field: { ...context.data[0].field },
            value: [],
          },
        ],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [],
        negate: false,
        dataViewId,
      });
    });

    it('should notify the user when value type is unsupported', async () => {
      await filterOutAction.execute({
        ...context,
        data: [
          {
            ...context.data[0],
            value: { a: {} },
          },
        ],
      });
      expect(mockCreateFilter).not.toHaveBeenCalled();
      expect(mockWarningToast).toHaveBeenCalled();
    });
  });
});
