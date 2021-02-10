/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataAdapter } from './data_adapter';

describe('DataAdapter', () => {
  let adapter: DataAdapter;

  beforeEach(() => {
    adapter = new DataAdapter();
  });

  describe('getTabular()', () => {
    it('should return a null promise when called before initialized', () => {
      expect(adapter.getTabular()).resolves.toEqual({
        data: null,
        options: {},
      });
    });

    it('should call the provided callback and resolve with its value', async () => {
      const data = { columns: [], rows: [] };
      const spy = jest.fn(() => data);
      adapter.setTabularLoader(spy);
      expect(spy).not.toBeCalled();
      const result = await adapter.getTabular();
      expect(spy).toBeCalled();
      expect(result.data).toBe(data);
    });

    it('should pass through options specified via setTabularLoader', async () => {
      const data = { columns: [], rows: [] };
      adapter.setTabularLoader(() => data, { returnsFormattedValues: true });
      const result = await adapter.getTabular();
      expect(result.options).toEqual({ returnsFormattedValues: true });
    });

    it('should return options set when starting loading data', async () => {
      const data = { columns: [], rows: [] };
      adapter.setTabularLoader(() => data, { returnsFormattedValues: true });
      const waitForResult = adapter.getTabular();
      adapter.setTabularLoader(() => data, { returnsFormattedValues: false });
      const result = await waitForResult;
      expect(result.options).toEqual({ returnsFormattedValues: true });
    });
  });

  it('should emit a "tabular" event when a new tabular loader is specified', () => {
    const data = { columns: [], rows: [] };
    const spy = jest.fn();
    adapter.once('change', spy);
    adapter.setTabularLoader(() => data);
    expect(spy).toBeCalled();
  });
});
