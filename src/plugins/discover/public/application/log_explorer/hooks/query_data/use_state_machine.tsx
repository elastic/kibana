/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { QueryStart } from '@kbn/data-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { useInterpret } from '@xstate/react';
import createContainer from 'constate';
import moment from 'moment';
import { useMemo } from 'react';
import { merge, of } from 'rxjs';
import {
  dataAccessStateMachine,
  loadAfter,
  loadAround,
  loadBefore,
} from '../../state_machines/data_access_state_machine';
import { loadTail } from '../../state_machines/data_access_state_machine/load_tail_service';
import { loadHistogram } from '../../state_machines/data_access_state_machine/load_histogram_service';
import { useSubscription } from '../use_observable';
import { useDiscoverStateContext } from '../discover_state/use_discover_state';

export const useStateMachineService = ({
  virtualRowCount,
  query,
}: {
  virtualRowCount: number;
  query: QueryStart;
}) => {
  const { searchSource, dataView } = useDiscoverStateContext();

  const {
    timefilter: { timefilter },
    filterManager,
    queryString,
  } = query;
  const centerRowIndex = useMemo(() => Math.floor(virtualRowCount / 2), [virtualRowCount]);

  const dataAccessService = useInterpret(
    () => {
      const initialTimeRange = timefilter.getAbsoluteTime();

      return dataAccessStateMachine.withContext({
        configuration: {
          chunkSize: 200,
          minimumChunkOverscan: 50,
          maximumRowCount: virtualRowCount,
        },
        dataView,
        timeRange: initialTimeRange,
        filters: filterManager.getFilters(),
        query: queryString.getQuery(),
        position: {
          timestamp: getMiddleOfTimeRange(initialTimeRange),
          tiebreaker: 0,
        },
        topChunk: {
          status: 'uninitialized',
        },
        bottomChunk: {
          status: 'uninitialized',
        },
        histogram: {
          data: [],
        },
      });
    },
    {
      services: {
        loadAround: loadAround({
          centerRowIndex,
          dataView,
          query,
          searchSource,
        }),
        loadBefore: loadBefore({
          dataView,
          query,
          searchSource,
        }),
        loadAfter: loadAfter({
          dataView,
          query,
          searchSource,
        }),
        loadTail: loadTail({
          dataView,
          query,
          searchSource,
        }),
        loadHistogram: loadHistogram({
          dataView,
          query,
          searchSource,
        }),
      },
      delays: {
        loadTailDelay: () => timefilter.getRefreshInterval().value,
      },
      devTools: true,
    }
  );

  // react to time filter changes
  useSubscription(
    useMemo(() => timefilter.getFetch$(), [timefilter]),
    {
      next: () => {
        dataAccessService.send({
          type: 'timeRangeChanged',
          timeRange: timefilter.getAbsoluteTime(),
        });
      },
    }
  );

  // react to auto-refresh changes
  useSubscription(
    useMemo(() => timefilter.getRefreshIntervalUpdate$(), [timefilter]),
    {
      next: () => {
        const refreshInterval = timefilter.getRefreshInterval();

        if (refreshInterval.pause) {
          dataAccessService.send({
            type: 'stopTailing',
          });
        } else if (timefilter.getTime().to === 'now') {
          dataAccessService.send({
            type: 'startTailing',
          });
        }
      },
    }
  );

  // react to filter and query changes
  useSubscription(
    useMemo(
      () =>
        merge(
          of(undefined), // trigger initial transition, since the query string observable doesn't emit initially
          filterManager.getUpdates$(),
          queryString.getUpdates$()
        ),
      [filterManager, queryString]
    ),
    {
      next: () => {
        const filters = filterManager.getFilters();
        const esQuery = queryString.getQuery();

        dataAccessService.send({
          type: 'filtersChanged',
          filters,
          query: esQuery,
        });
      },
    }
  );

  return dataAccessService;
};

export const [StateMachineProvider, useStateMachineContext] =
  createContainer(useStateMachineService);

// export const useStateMachineContextSelector = <T, TEmitted = DataAccessService['state']>(
//   selector: (emitted: TEmitted) => T,
//   compare?: (a: T, b: T) => boolean,
//   getSnapshot?: (a: DataAccessService) => TEmitted
// ) => {
//   const dataAccessMachine = useStateMachineContext();

//   return useSelector(dataAccessMachine, selector, compare, getSnapshot);
// };

// export const useStateMachineContextActor = () => {
//   const dataAccessService = useStateMachineContext();
//   return useActor(dataAccessService);
// };

const getMiddleOfTimeRange = ({ from, to }: TimeRange): string => {
  const fromMoment = moment.utc(from);
  const toMoment = moment.utc(to);

  return fromMoment.add(toMoment.diff(fromMoment) / 2, 'ms').toISOString();
};
