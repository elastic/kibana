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
import { useSubscription } from '../../hooks/use_observable';
import { useThrottled } from '../../hooks/use_throttled';
import { selectDiscoverRows } from '../../state_machines/entries_state_machine';

type GridOnItemsRenderedProps = Parameters<
  NonNullable<NonNullable<EuiDataGridProps['virtualizationOptions']>['onItemsRendered']>
>[0];

const SEND_THROTTLE_DELAY = 1000;

export const useScrollInteractions = ({
  imperativeGridRef,
}: {
  imperativeGridRef: MutableRefObject<EuiDataGridRefProps | null>;
}) => {
  const { actor: entriesActor } = useEntries();
  const { endRowIndex } = useSelector(entriesActor, selectDiscoverRows);
  const throttledSend = useThrottled(entriesActor.send, SEND_THROTTLE_DELAY);

  // const initializedGenerationIdRef = useRef<string>();

  useSubscription(entriesActor, {
    next: (state) => {
      if (state.matches('tailing') && state.changed) {
        // scroll to bottom when tailing starts or loading finishes
        if (endRowIndex != null) {
          imperativeGridRef.current?.scrollToItem?.({ rowIndex: endRowIndex, align: 'end' });
        }
      }
    },
  });

  const onItemsRendered = useCallback(
    (props: GridOnItemsRenderedProps) => {
      if (imperativeGridRef.current == null) {
        return;
      }

      const { visibleRowStartIndex, visibleRowStopIndex } = props;

      throttledSend({
        type: 'visibleEntriesChanged',
        visibleStartRowIndex: visibleRowStartIndex,
        visibleEndRowIndex: visibleRowStopIndex,
        gridApi: imperativeGridRef.current,
      });
    },
    [imperativeGridRef, throttledSend]
  );

  return {
    onItemsRendered,
  };
};
