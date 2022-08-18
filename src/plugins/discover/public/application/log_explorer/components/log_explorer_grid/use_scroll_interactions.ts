/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDataGridRefProps } from '@elastic/eui';
import { MutableRefObject, useEffect } from 'react';
import { useStateMachineContext } from '../../hooks/query_data/use_state_machine';
import { memoizedSelectRows } from '../../state_machines/data_access_state_machine';

export const useScrollInteractions = ({
  imperativeGridRef,
}: {
  imperativeGridRef: MutableRefObject<EuiDataGridRefProps | null>;
}) => {
  const stateMachine = useStateMachineContext();

  useEffect(() => {
    const transitionListener: Parameters<typeof stateMachine['onTransition']>[0] = (
      state,
      event
    ) => {
      if (state.matches({ documents: 'tailing' }) && state.changed) {
        // scroll to bottom when tailing starts or loading finishes
        const { endRowIndex } = memoizedSelectRows(state);

        if (endRowIndex != null) {
          imperativeGridRef.current?.scrollToItem?.({ rowIndex: endRowIndex, align: 'end' });
        }
      } else if (event.type === 'loadAroundSucceeded') {
        // scroll to middle when finished complete reload
        const { chunkBoundaryRowIndex } = memoizedSelectRows(state);

        imperativeGridRef.current?.scrollToItem?.({
          rowIndex: chunkBoundaryRowIndex,
          align: 'start',
        });
      }
    };

    stateMachine.onTransition(transitionListener);

    return () => {
      stateMachine.off(transitionListener);
    };
  }, [imperativeGridRef, stateMachine]);
};
