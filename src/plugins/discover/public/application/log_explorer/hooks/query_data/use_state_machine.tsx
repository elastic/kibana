/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import createContainer from 'constate';
import React from 'react';
import { ISearchSource, QueryStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { useInterpret, useActor } from '@xstate/react';
import { ignoreElements, timer } from 'rxjs';
import { assign } from 'xstate';
import { dataAccessStateMachine } from '../../state_machines';
import { loadAround, updateChunks } from '../../state_machines/services/load_around';
import { useSubscription } from '../use_observable';

export const useStateMachineService = ({
  children,
  dataView,
  query,
  searchSource,
}: {
  children: React.ReactNode;
  dataView: DataView;
  query: QueryStart;
  searchSource: ISearchSource;
}) => {
  const dataAccessService = useInterpret(
    () => {
      const initialTimeRange = query.timefilter.timefilter.getAbsoluteTime();

      return dataAccessStateMachine.withContext({
        dataView,
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
        updateChunks,
      },
      guards: {
        succeededTop: constantGuard(true),
        succeededBottom: constantGuard(true),
        isNearStart: constantGuard(false),
        isNearEnd: constantGuard(false),
        isWithinLoadedChunks: constantGuard(false),
        startTimestampExtendsLoadedTop: constantGuard(false),
        startTimestampReducesLoadedTop: constantGuard(false),
        endTimestampExtendsLoadedBottom: constantGuard(false),
        endTimestampReducesLoadedBottom: constantGuard(false),
      },
      services: {
        loadAround: loadAround({ dataView, query, searchSource }),
      },
      devTools: true,
    }
  );

  // react to time filter changes
  useSubscription(query.timefilter.timefilter.getFetch$(), {
    next: () => {
      dataAccessService.send({
        type: 'timeRangeChanged',
        timeRange: query.timefilter.timefilter.getAbsoluteTime(),
      });
    },
  });

  return dataAccessService;
};

export const [StateMachineProvider, useStateMachineContext] =
  createContainer(useStateMachineService);

export const useStateMachineContextState = () => {
  const dataAccessService = useStateMachineContext();
  const [state] = useActor(dataAccessService);
  return state;
};

const createDummyService =
  (delay: number = 3000) =>
  () =>
    timer(delay).pipe(ignoreElements());

const constantGuard =
  <Value extends unknown>(value: Value) =>
  () =>
    value;
