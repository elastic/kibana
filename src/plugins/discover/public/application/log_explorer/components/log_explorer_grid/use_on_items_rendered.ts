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
import { useEntries } from '../../hooks/query_data/use_state_machine';
import { useThrottled } from '../../hooks/use_throttled';
import { memoizedSelectRows } from '../../state_machines/entries_state_machine';

type GridOnItemsRenderedProps = Parameters<
  NonNullable<NonNullable<EuiDataGridProps['virtualizationOptions']>['onItemsRendered']>
>[0];

const SEND_THROTTLE_DELAY = 1000;

export const useOnItemsRendered = ({
  imperativeGridRef,
}: {
  imperativeGridRef: MutableRefObject<EuiDataGridRefProps | null>;
}) => {
  const [entriesActor] = useEntries();

  const { startRowIndex, endRowIndex } = useSelector(entriesActor, memoizedSelectRows);

  const throttledSend = useThrottled(entriesActor.send, SEND_THROTTLE_DELAY);

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

      if (visibleRowStartIndex < startRowIndex) {
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
    [endRowIndex, imperativeGridRef, startRowIndex, throttledSend]
  );
};
