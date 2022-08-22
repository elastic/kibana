/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDataGridProps, EuiDataGridRefProps } from '@elastic/eui';
import { useSelector } from '@xstate/react';
import { MutableRefObject, useCallback, useRef } from 'react';
import { useStateMachineContext } from '../../hooks/query_data/use_state_machine';
import { useThrottled } from '../../hooks/use_throttled';
import { memoizedSelectRows } from '../../state_machines/data_access_state_machine';

type GridOnItemsRenderedProps = Parameters<
  NonNullable<NonNullable<EuiDataGridProps['virtualizationOptions']>['onItemsRendered']>
>[0];

const SEND_THROTTLE_DELAY = 1000;

export const useOnItemsRendered = ({
  imperativeGridRef,
}: {
  imperativeGridRef: MutableRefObject<EuiDataGridRefProps | null>;
}) => {
  const stateMachine = useStateMachineContext();
  const { chunkBoundaryRowIndex, startRowIndex, endRowIndex, maximumRowIndex, minimumRowIndex } =
    useSelector(stateMachine, memoizedSelectRows);

  const hasPerformedInitialScrollRef = useRef(false);

  const throttledSend = useThrottled(stateMachine.send, SEND_THROTTLE_DELAY);

  return useCallback(
    ({ visibleRowStartIndex, visibleRowStopIndex }: GridOnItemsRenderedProps) => {
      if (startRowIndex == null || endRowIndex == null) {
        return;
      }

      throttledSend({
        type: 'visibleEntriesChanged',
        visibleStartRowIndex: visibleRowStartIndex,
        visibleEndRowIndex: visibleRowStopIndex,
      });

      if (
        !hasPerformedInitialScrollRef.current &&
        chunkBoundaryRowIndex != null &&
        chunkBoundaryRowIndex > 0
      ) {
        // perform initial scrolling
        // we can't do this too early in a `useEffect`, because the EuiDataGrid
        // sets the row count to 0 until has measured the header height
        imperativeGridRef.current?.scrollToItem?.({
          rowIndex: chunkBoundaryRowIndex,
          align: 'start',
        });
        hasPerformedInitialScrollRef.current = true;
      } else if (visibleRowStartIndex < startRowIndex && visibleRowStartIndex > minimumRowIndex) {
        // block scrolling outside of loaded area
        imperativeGridRef.current?.scrollToItem?.({
          rowIndex: startRowIndex,
          align: 'start',
        });
      } else if (visibleRowStopIndex > endRowIndex && visibleRowStopIndex < maximumRowIndex) {
        // block scrolling outside of loaded area
        imperativeGridRef.current?.scrollToItem?.({
          rowIndex: endRowIndex,
          align: 'end',
        });
      }
    },
    [
      chunkBoundaryRowIndex,
      endRowIndex,
      imperativeGridRef,
      maximumRowIndex,
      minimumRowIndex,
      startRowIndex,
      throttledSend,
    ]
  );
};
