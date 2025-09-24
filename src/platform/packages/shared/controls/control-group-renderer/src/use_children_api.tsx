/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';

import type { StickyControlState } from '@kbn/controls-schemas';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { Filter } from '@kbn/es-query';
import {
  apiPublishesESQLVariable,
  type ESQLControlVariable,
  type PublishesESQLVariable,
} from '@kbn/esql-types';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import {
  apiAppliesFilters,
  type AppliesFilters,
  type SerializedPanelState,
} from '@kbn/presentation-publishing';

import type { ControlGroupCreationOptions } from './types';

export const useChildrenApi = (state: ControlGroupCreationOptions | undefined) => {
  const currentChildState = useRef<{ [id: string]: SerializedPanelState<StickyControlState> }>({});

  useEffect(() => {
    Object.entries(state?.initialState?.initialChildControlState ?? {}).forEach(([id, control]) => {
      currentChildState.current[id] = {
        rawState: {
          ...control,
        },
      };
    });
  }, [state]);

  const childrenApi = useMemo(() => {
    const children$ = new BehaviorSubject<{ [uuid: string]: DefaultEmbeddableApi }>({});

    return {
      children$,
      registerChildApi: (child: DefaultEmbeddableApi) => {
        children$.next({
          ...children$.value,
          [child.uuid]: child,
        });
      },
      setSerializedStateForChild: (
        id: string,
        childState: SerializedPanelState<StickyControlState>
      ) => {
        currentChildState.current[id] = childState;
      },
      getSerializedStateForChild: (id: string) => currentChildState.current[id],
      appliedFilters$: combineCompatibleChildrenApis<AppliesFilters, Filter[] | undefined>(
        { children$ },
        'appliedFilters$',
        apiAppliesFilters,
        [],
        (values) => {
          const allOutputFilters = values.filter(
            (childOutputFilters) => childOutputFilters && childOutputFilters.length > 0
          ) as Filter[][];
          return allOutputFilters && allOutputFilters.length > 0
            ? allOutputFilters.flat()
            : undefined;
        }
      ).pipe(distinctUntilChanged(deepEqual)),
      esqlVariables$: combineCompatibleChildrenApis<PublishesESQLVariable, ESQLControlVariable[]>(
        { children$ },
        'esqlVariable$',
        apiPublishesESQLVariable,
        []
      ),
      timeslice$: new BehaviorSubject(undefined),
    };
  }, []);

  return childrenApi;
};
