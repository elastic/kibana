/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, createContext } from 'react';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { useInterpret, useActor } from '@xstate/react';
import { ignoreElements, timer } from 'rxjs';
import { assign } from 'xstate';
import { dataAccessStateMachine } from '../../state_machines';

const createDummyService =
  (delay: number = 3000) =>
  () =>
    timer(delay).pipe(ignoreElements());

export const StateMachineContext = createContext({});

export const StateMachineProvider = ({
  timefilter,
  children,
}: {
  timefilter: TimefilterContract;
  children: React.ReactNode;
}) => {
  const dataAccessService = useInterpret(
    () => {
      const initialTimeRange = timefilter.getAbsoluteTime();

      return dataAccessStateMachine.withContext({
        timeRange: initialTimeRange,
        position: {
          timestamp: initialTimeRange.from,
          tiebreaker: 0,
        },
        topChunk: {
          status: 'uninitialized',
        },
        bottomChunk: {
          status: 'uninitialized',
        },
      });
    },
    {
      actions: {
        resetChunks: assign((context) => ({
          ...context,
          topChunk: {
            status: 'uninitialized' as const,
          },
          bottomChunk: {
            status: 'uninitialized' as const,
          },
        })),
      },
      services: {
        loadAround: createDummyService(),
      },
      devTools: true,
    }
  );

  return (
    <StateMachineContext.Provider value={{ dataAccessService }}>
      {props.children}
    </StateMachineContext.Provider>
  );
};

export const useStateMachineState = () => {
  const services = useContext(StateMachineContext);
  const [state] = useActor(services.dataAccessService);
  return state;
};
