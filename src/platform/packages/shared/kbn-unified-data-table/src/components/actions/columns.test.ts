/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStateColumnActions } from './columns';
import { dataViewMock, dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import type { Capabilities } from '@kbn/core/types';
import { dataViewsMock } from '../../../__mocks__/data_views';
import type { UnifiedDataTableSettings } from '../../types';
import type { DataView } from '@kbn/data-views-plugin/public';

function getStateColumnAction(
  state: { columns?: string[]; sort?: string[][]; settings?: UnifiedDataTableSettings },
  setAppState: (state: { columns: string[]; sort?: string[][] }) => void,
  dataView: DataView = dataViewMock
) {
  return getStateColumnActions({
    capabilities: {
      discover: {
        save: false,
      },
    } as unknown as Capabilities,
    dataView,
    dataViews: dataViewsMock,
    setAppState,
    columns: state.columns,
    sort: state.sort,
    defaultOrder: 'desc',
    settings: state.settings,
  });
}

describe('Test column actions', () => {
  test('getStateColumnActions with empty state', () => {
    const setAppState = jest.fn();
    const actions = getStateColumnAction({}, setAppState);

    actions.onAddColumn('_score');
    expect(setAppState).toHaveBeenCalledWith({ columns: ['_score'], sort: [['_score', 'desc']] });
    actions.onAddColumn('test');
    expect(setAppState).toHaveBeenCalledWith({ columns: ['test'] });
  });

  test('getStateColumnActions with columns and sort in state', () => {
    const setAppState = jest.fn();
    const actions = getStateColumnAction(
      { columns: ['first', 'second'], sort: [['first', 'desc']] },
      setAppState
    );

    actions.onAddColumn('_score');
    expect(setAppState).toHaveBeenCalledWith({
      columns: ['first', 'second', '_score'],
      sort: [['first', 'desc']],
    });
    setAppState.mockClear();
    actions.onAddColumn('third');
    expect(setAppState).toHaveBeenCalledWith({
      columns: ['first', 'second', 'third'],
      sort: [['first', 'desc']],
    });
    setAppState.mockClear();
    actions.onRemoveColumn('first');
    expect(setAppState).toHaveBeenCalledWith({
      columns: ['second'],
      sort: [],
    });
    setAppState.mockClear();
    actions.onSetColumns(['first', 'second', 'third'], true);
    expect(setAppState).toHaveBeenCalledWith({
      columns: ['first', 'second', 'third'],
    });
    setAppState.mockClear();

    actions.onMoveColumn('second', 0);
    expect(setAppState).toHaveBeenCalledWith({
      columns: ['second', 'first'],
    });
  });

  it('should pass settings to setAppState', () => {
    const setAppState = jest.fn();
    const settings: UnifiedDataTableSettings = { columns: { first: { width: 100 } } };
    const actions = getStateColumnAction({ columns: ['first'], settings }, setAppState);
    actions.onAddColumn('second');
    expect(setAppState).toHaveBeenCalledWith({ columns: ['first', 'second'], settings });
    setAppState.mockClear();
    actions.onRemoveColumn('second');
    expect(setAppState).toHaveBeenCalledWith({ columns: ['first'], settings, sort: [] });
    setAppState.mockClear();
    actions.onMoveColumn('first', 0);
    expect(setAppState).toHaveBeenCalledWith({ columns: ['first'], settings });
    setAppState.mockClear();
    actions.onSetColumns(['first', 'second'], true);
    expect(setAppState).toHaveBeenCalledWith({ columns: ['first', 'second'], settings });
    setAppState.mockClear();
  });

  it('should clean up settings to remove non-existing columns', () => {
    const setAppState = jest.fn();
    const actions = getStateColumnAction(
      {
        columns: ['first', 'second', 'third'],
        settings: { columns: { first: { width: 100 }, second: { width: 200 } } },
      },
      setAppState
    );
    actions.onRemoveColumn('second');
    expect(setAppState).toHaveBeenCalledWith({
      columns: ['first', 'third'],
      settings: { columns: { first: { width: 100 } } },
      sort: [],
    });
    setAppState.mockClear();
    actions.onSetColumns(['first', 'third'], true);
    expect(setAppState).toHaveBeenCalledWith({
      columns: ['first', 'third'],
      settings: { columns: { first: { width: 100 } } },
    });
  });

  it('should reset the last column to auto width if only absolute width columns remain', () => {
    const setAppState = jest.fn();
    let actions = getStateColumnAction(
      {
        columns: ['first', 'second', 'third'],
        settings: { columns: { second: { width: 100 }, third: { width: 100, display: 'test' } } },
      },
      setAppState
    );
    actions.onRemoveColumn('first');
    expect(setAppState).toHaveBeenCalledWith({
      columns: ['second', 'third'],
      settings: { columns: { second: { width: 100 }, third: { display: 'test' } } },
      sort: [],
    });
    setAppState.mockClear();
    actions = getStateColumnAction(
      {
        columns: ['first', 'second', 'third'],
        settings: { columns: { second: { width: 100 }, third: { width: 100 } } },
      },
      setAppState
    );
    actions.onSetColumns(['second', 'third'], true);
    expect(setAppState).toHaveBeenCalledWith({
      columns: ['second', 'third'],
      settings: { columns: { second: { width: 100 } } },
    });
  });

  it('should not reset the last column to auto width if there are remaining auto width columns', () => {
    const setAppState = jest.fn();
    const actions = getStateColumnAction(
      { columns: ['first', 'second', 'third'], settings: { columns: { third: { width: 100 } } } },
      setAppState
    );
    actions.onRemoveColumn('first');
    expect(setAppState).toHaveBeenCalledWith({
      columns: ['second', 'third'],
      settings: { columns: { third: { width: 100 } } },
      sort: [],
    });
    setAppState.mockClear();
    actions.onSetColumns(['second', 'third'], true);
    expect(setAppState).toHaveBeenCalledWith({
      columns: ['second', 'third'],
      settings: { columns: { third: { width: 100 } } },
    });
  });

  describe('Summary column coexistence', () => {
    it('keeps _source when adding another column', () => {
      const setAppState = jest.fn();
      const actions = getStateColumnAction({ columns: ['message', '_source'] }, setAppState);

      actions.onAddColumn('extension');

      expect(setAppState).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: ['message', '_source', 'extension'],
        })
      );
    });

    it('keeps sole _source when the last field column is removed', () => {
      const setAppState = jest.fn();
      const actions = getStateColumnAction({ columns: ['message', '_source'] }, setAppState);

      actions.onRemoveColumn('message');

      expect(setAppState).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: ['_source'],
          sort: [],
        })
      );
    });

    it('restores field columns alongside pinned _source when adding after summary-only', () => {
      const setAppState = jest.fn();
      const actions = getStateColumnAction({ columns: ['_source'] }, setAppState);

      actions.onAddColumn('message');

      expect(setAppState).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: ['_source', 'message'],
        })
      );
    });

    it('does not add _source when leaving classic empty summary-only', () => {
      const setAppState = jest.fn();
      const actions = getStateColumnAction({ columns: [] }, setAppState);

      actions.onAddColumn('message');

      expect(setAppState).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: ['message'],
        })
      );
    });

    it('keeps sole _source through onSetColumns and resets its width to auto', () => {
      const setAppState = jest.fn();
      const actions = getStateColumnAction(
        {
          columns: ['message', '_source'],
          settings: { columns: { _source: { width: 400 }, message: { width: 100 } } },
        },
        setAppState
      );

      actions.onSetColumns(['_source'], true);

      expect(setAppState).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: ['_source'],
          // Last remaining absolute-width column is reset to auto width
          settings: { columns: {} },
        })
      );
    });
  });

  describe('Display-only time column', () => {
    it('preserves its width when reordering columns', () => {
      const setAppState = jest.fn();
      const settings: UnifiedDataTableSettings = {
        columns: {
          '@timestamp': { width: 212 },
          message: { width: 150 },
          extension: { width: 120 },
        },
      };
      const actions = getStateColumnAction(
        {
          columns: ['message', 'extension'],
          settings,
        },
        setAppState,
        dataViewMockWithTimeField
      );

      // Classic table prepends the time field in visible columns and calls onSetColumns(..., false)
      actions.onSetColumns(['@timestamp', 'extension', 'message'], false);

      expect(setAppState).toHaveBeenCalledWith({
        columns: ['extension', 'message'],
        settings,
      });
    });
  });
});
