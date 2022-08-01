/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDataGridProps, EuiDataGridRefProps } from '@elastic/eui';
import { useSelector } from '@xstate/react';
import { MutableRefObject, useCallback } from 'react';
import { useStateMachineContext, useThrottled } from '../../hooks/query_data/use_state_machine';
import { selectLoadedEntries } from '../../state_machines/data_access_state_machine';

type GridOnItemsRenderedProps = Parameters<
  NonNullable<NonNullable<EuiDataGridProps['virtualizationOptions']>['onItemsRendered']>
>[0];

const SEND_THROTTLE_DELAY = 500;

export const useOnItemsRendered = ({
  imperativeGridRef,
}: {
  imperativeGridRef: MutableRefObject<EuiDataGridRefProps | null>;
}) => {
  const stateMachine = useStateMachineContext();

  const { startRowIndex, endRowIndex, chunkBoundaryRowIndex } = useSelector(
    stateMachine,
    selectLoadedEntries
  );

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

      // TODO: trigger position update in state machine
      if (visibleRowStartIndex === 0 && visibleRowStartIndex < startRowIndex) {
        // scroll to initial position
        imperativeGridRef.current?.scrollToItem?.({
          rowIndex: chunkBoundaryRowIndex,
          align: 'start',
        });
      } else if (visibleRowStartIndex < startRowIndex) {
        // block scrolling outside of loaded area
        imperativeGridRef.current?.scrollToItem?.({
          rowIndex: startRowIndex,
          align: 'start',
        });
      } else if (visibleRowStopIndex > endRowIndex) {
        // block scrolling outside of loaded area
        imperativeGridRef.current?.scrollToItem?.({
          rowIndex: endRowIndex,
          align: 'end',
        });
      }
    },
    [chunkBoundaryRowIndex, endRowIndex, imperativeGridRef, startRowIndex, throttledSend]
  );
};
