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
import { createFilterInActionFactory } from './filter_in';
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

describe('createFilterInActionFactory', () => {
  const filterInActionFactory = createFilterInActionFactory({
    filterManager: mockFilterManager,
    notifications: { toasts: { addWarning: mockWarningToast } } as unknown as NotificationsStart,
  });
  const filterInAction = filterInActionFactory({ id: 'testAction' });
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
    expect(filterInAction.getDisplayName(context)).toEqual('Filter for');
  });

  it('should return icon type', () => {
    expect(filterInAction.getIconType(context)).toEqual('plusInCircle');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await filterInAction.isCompatible(context)).toEqual(true);
    });

    it('should return false if field.name not valid', async () => {
      expect(
        await filterInAction.isCompatible({
          ...context,
          data: [
            {
              ...context.data[0],
              field: { ...context.data[0].field, name: '' },
            },
          ],
        })
      ).toEqual(false);
    });

    it('should return false if Kbn type is unsupported', async () => {
      expect(
        await filterInAction.isCompatible({
          ...context,
          data: [
            {
              ...context.data[0],
              field: { ...context.data[0].field, type: KBN_FIELD_TYPES.MISSING },
            },
          ],
        })
      ).toEqual(false);
    });
  });

  describe('execute', () => {
    it('should add the filter to filterManager', async () => {
      await filterInAction.execute(context);
      expect(mockFilterManager.addFilters).toHaveBeenCalled();
    });

    it('should create filter query with value', async () => {
      await filterInAction.execute(context);
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [value],
        negate: false,
        dataViewId,
      });
    });

    it('should create filter query with array value', async () => {
      await filterInAction.execute({
        ...context,
        data: [
          {
            ...context.data[0],
            value: [value],
          },
        ],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [value],
        negate: false,
        dataViewId,
      });
    });

    it('should create negate filter query with null value', async () => {
      await filterInAction.execute({
        ...context,
        data: [
          {
            ...context.data[0],
            value: null,
          },
        ],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [],
        negate: true,
        dataViewId,
      });
    });

    it('should create negate filter query with undefined value', async () => {
      await filterInAction.execute({
        ...context,
        data: [
          {
            ...context.data[0],
            value: undefined,
          },
        ],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [],
        negate: true,
        dataViewId,
      });
    });

    it('should create negate filter query with empty string value', async () => {
      await filterInAction.execute({
        ...context,
        data: [
          {
            ...context.data[0],
            value: '',
          },
        ],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [''],
        negate: true,
        dataViewId,
      });
    });

    it('should create negate filter query with empty array value', async () => {
      await filterInAction.execute({
        ...context,
        data: [
          {
            ...context.data[0],
            value: [],
          },
        ],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [],
        negate: true,
        dataViewId,
      });
    });

    it('should notify the user when value type is unsupported', async () => {
      await filterInAction.execute({
        ...context,
        data: [
          {
            ...context.data[0],
            value: [{}, {}, {}],
          },
        ],
      });
      expect(mockCreateFilter).not.toHaveBeenCalled();
      expect(mockWarningToast).toHaveBeenCalled();
    });
  });
});
