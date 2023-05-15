/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { FilterManager } from '@kbn/data-plugin/public';
import { createFilterInActionFactory } from './filter_in';
import { makeActionContext } from '../../mocks/helpers';

const mockFilterManager = { addFilters: jest.fn() } as unknown as FilterManager;

const mockCreateFilter = jest.fn((_: any) => ({}));
jest.mock('./create_filter', () => ({
  ...jest.requireActual('./create_filter'),
  createFilter: (params: any) => mockCreateFilter(params),
}));

const fieldName = 'user.name';
const value = 'the value';

describe('createFilterInActionFactory', () => {
  const filterInActionFactory = createFilterInActionFactory({
    filterManager: mockFilterManager,
  });
  const filterInAction = filterInActionFactory({ id: 'testAction' });
  const context = makeActionContext({
    field: { name: fieldName, type: 'text', searchable: true, aggregatable: true },
    value,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(filterInAction.getDisplayName(context)).toEqual('Filter In');
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
          field: { ...context.field, name: '' },
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
        value,
        negate: false,
      });
    });

    it('should create filter query with array value', async () => {
      await filterInAction.execute({
        ...context,
        field: { ...context.field },
        value: [value],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: [value],
        negate: false,
      });
    });

    it('should create negate filter query with null value', async () => {
      await filterInAction.execute({
        ...context,
        field: { ...context.field },
        value: null,
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({ key: fieldName, value: null, negate: true });
    });

    it('should create negate filter query with undefined value', async () => {
      await filterInAction.execute({
        ...context,
        field: { ...context.field },
        value: undefined,
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({
        key: fieldName,
        value: undefined,
        negate: true,
      });
    });

    it('should create negate filter query with empty string value', async () => {
      await filterInAction.execute({
        ...context,
        field: { ...context.field },
        value: '',
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({ key: fieldName, value: '', negate: true });
    });

    it('should create negate filter query with empty array value', async () => {
      await filterInAction.execute({
        ...context,
        field: { ...context.field },
        value: [],
      });
      expect(mockCreateFilter).toHaveBeenCalledWith({ key: fieldName, value: [], negate: true });
    });
  });
});
