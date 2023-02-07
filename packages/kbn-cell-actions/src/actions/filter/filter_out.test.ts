/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CellActionExecutionContext } from '../../types';
import type { FilterManager } from '@kbn/data-plugin/public';
import { createFilterOutAction } from './filter_out';

const mockFilterManager = { addFilters: jest.fn() } as unknown as FilterManager;

describe('Default createFilterOutAction', () => {
  const filterInAction = createFilterOutAction({ filterManager: mockFilterManager });
  const context = {
    field: { name: 'user.name', value: 'the value', type: 'text' },
  } as CellActionExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(filterInAction.getDisplayName(context)).toEqual('Filter Out');
  });

  it('should return icon type', () => {
    expect(filterInAction.getIconType(context)).toEqual('minusInCircle');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await filterInAction.isCompatible(context)).toEqual(true);
    });
  });

  describe('execute', () => {
    it('should execute normally', async () => {
      await filterInAction.execute(context);
      expect(mockFilterManager.addFilters).toHaveBeenCalled();
    });
  });
});
