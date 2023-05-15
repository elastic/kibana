/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { FilterManager } from '@kbn/data-plugin/public';
import { createFilterOutActionFactory } from './filter_out';
import { makeActionContext } from '../../mocks/helpers';

const mockFilterManager = { addFilters: jest.fn() } as unknown as FilterManager;

const mockCreateFilter = jest.fn((_: any) => ({}));
jest.mock('./create_filter', () => ({
  ...jest.requireActual('./create_filter'),
  createFilter: (params: any) => mockCreateFilter(params),
}));

const fieldName = 'user.name';
const value = 'the value';

describe('createFilterOutAction', () => {
  const filterOutActionFactory = createFilterOutActionFactory({ filterManager: mockFilterManager });
  const filterOutAction = filterOutActionFactory({ id: 'testAction' });
  const context = makeActionContext({
    field: { name: fieldName, type: 'text', searchable: true, aggregatable: true },
    value,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(filterOutAction.getDisplayName(context)).toEqual('Filter Out');
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
          field: { ...context.field, name: '' },
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
      expect(mockCreateFilter).toHaveBeenCalledWith({ key: fieldName, value, negate: true });
    });

    it('should create negate filter query with array value', async () => {
      await filterOutAction.execute({
        ...context,
        field: { ...context.field },
        value: [value],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [value],
        negate: true,
      });
    });

    it('should create filter query with null value', async () => {
      await filterOutAction.execute({
        ...context,
        field: { ...context.field },
        value: null,
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({ key: fieldName, value: null, negate: false });
    });

    it('should create filter query with undefined value', async () => {
      await filterOutAction.execute({
        ...context,
        field: { ...context.field },
        value: undefined,
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: undefined,
        negate: false,
      });
    });

    it('should create negate filter query with empty string value', async () => {
      await filterOutAction.execute({
        ...context,
        field: { ...context.field },
        value: '',
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({ key: fieldName, value: '', negate: false });
    });

    it('should create negate filter query with empty array value', async () => {
      await filterOutAction.execute({
        ...context,
        field: { ...context.field },
        value: [],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({ key: fieldName, value: [], negate: false });
    });
  });
});
