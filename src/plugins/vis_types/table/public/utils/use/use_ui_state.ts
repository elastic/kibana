/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce, isEqual } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PersistedState } from '@kbn/visualizations-plugin/public';

import { ColumnWidthData, TableVisUiState, TableVisUseUiStateProps } from '../../types';

const defaultSort = {
  columnIndex: null,
  direction: null,
};

export const useUiState = (uiState: PersistedState): TableVisUseUiStateProps => {
  const [sort, setSortState] = useState<TableVisUiState['sort']>(
    uiState?.get('vis.params.sort') || defaultSort
  );

  const [columnsWidth, setColumnsWidthState] = useState<TableVisUiState['colWidth']>(
    uiState?.get('vis.params.colWidth') || []
  );

  const uiStateValues = useRef<{
    columnsWidth: ColumnWidthData[];
    sort: TableVisUiState['sort'];
    /**
     * Property to filter out the changes, which were done internally via local state.
     */
    pendingUpdate: boolean;
  }>({
    columnsWidth: uiState?.get('vis.params.colWidth'),
    sort: uiState?.get('vis.params.sort'),
    pendingUpdate: false,
  });

  const setSort = useCallback(
    (s: TableVisUiState['sort'] = defaultSort) => {
      setSortState(s || defaultSort);

      uiStateValues.current.sort = s;
      uiStateValues.current.pendingUpdate = true;

      /**
       * Since the visualize app state is listening for uiState changes,
       * it synchronously re-renders an editor frame.
       * Setting new uiState values in the new event loop task,
       * helps to update the visualization frame firstly and not to block the rendering flow
       */
      setTimeout(() => {
        uiState?.set('vis.params.sort', s);
        uiStateValues.current.pendingUpdate = false;
      });
    },
    [uiState]
  );

  const setColumnsWidth = useCallback(
    (col: ColumnWidthData) => {
      setColumnsWidthState((prevState) => {
        const updated = [...prevState];
        const idx = prevState.findIndex((c) => c.colIndex === col.colIndex);

        if (idx >= 0) {
          updated[idx] = col;
        } else {
          updated.push(col);
        }

        uiStateValues.current.columnsWidth = updated;
        uiStateValues.current.pendingUpdate = true;

        /**
         * Since the visualize app state is listening for uiState changes,
         * it synchronously re-renders an editor frame.
         * Setting new uiState values in the new event loop task,
         * helps to update the visualization frame firstly and not to block the rendering flow
         */
        setTimeout(() => {
          uiState?.set('vis.params.colWidth', updated);
          uiStateValues.current.pendingUpdate = false;
        });
        return updated;
      });
    },
    [uiState]
  );

  useEffect(() => {
    /**
     * Debounce is in place since there are couple of synchronous updates of the uiState,
     * which are also handled synchronously.
     */
    const updateOnChange = debounce(() => {
      // skip uiState updates if there are pending internal state updates
      if (uiStateValues.current.pendingUpdate) {
        return;
      }

      const { vis } = uiState?.getChanges();

      if (!isEqual(vis?.params.colWidth, uiStateValues.current.columnsWidth)) {
        uiStateValues.current.columnsWidth = vis?.params.colWidth;
        setColumnsWidthState(vis?.params.colWidth || []);
      }

      if (!isEqual(vis?.params.sort, uiStateValues.current.sort)) {
        uiStateValues.current.sort = vis?.params.sort;
        setSortState(vis?.params.sort || defaultSort);
      }
    });

    uiState?.on('change', updateOnChange);

    return () => {
      uiState?.off('change', updateOnChange);
    };
  }, [uiState]);

  return { columnsWidth, sort, setColumnsWidth, setSort };
};
