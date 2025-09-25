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
import { BehaviorSubject, distinctUntilChanged, map, tap } from 'rxjs';

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { Filter } from '@kbn/es-query';
import {
  apiPublishesESQLVariable,
  type ESQLControlVariable,
  type PublishesESQLVariable,
} from '@kbn/esql-types';
import {
  childrenUnsavedChanges$,
  combineCompatibleChildrenApis,
} from '@kbn/presentation-containers';
import {
  apiAppliesFilters,
  type AppliesFilters,
  type SerializedPanelState,
} from '@kbn/presentation-publishing';

import type { ControlGroupCreationOptions } from './types';

export const useChildrenApi = (
  state: ControlGroupCreationOptions | undefined,
  lastSavedChildState$Ref: React.MutableRefObject<
    BehaviorSubject<{ [id: string]: SerializedPanelState<object> }>
  >
) => {
  const currentChildState = useRef<{ [id: string]: SerializedPanelState<object> }>({});
  const children$Ref = useRef(new BehaviorSubject<{ [uuid: string]: DefaultEmbeddableApi }>({}));

  useEffect(() => {
    const lastSavedStateSubscription = lastSavedChildState$Ref.current.subscribe(
      (lastSavedState) => {
        console.log({ lastSavedState });
        currentChildState.current = lastSavedState;
      }
    );

    const unsavedChangesSubscription = childrenUnsavedChanges$(children$Ref.current)
      .pipe(map((children) => children.some(({ hasUnsavedChanges }) => hasUnsavedChanges)))
      .subscribe((hasUnsavedChanges) => {
        if (hasUnsavedChanges) {
          const result = Object.values(children$Ref.current.getValue()).reduce((prev, child) => {
            return {
              ...prev,
              [child.uuid]: child.serializeState(),
            };
          }, {});
          currentChildState.current = result;
        }
      });
    return () => {
      lastSavedStateSubscription.unsubscribe();
      unsavedChangesSubscription.unsubscribe();
    };
  }, [lastSavedChildState$Ref]);

  const childrenApi = useMemo(() => {
    if (!state) return;

    return {
      children$: children$Ref.current,
      registerChildApi: (child: DefaultEmbeddableApi) => {
        children$Ref.current.next({
          ...children$Ref.current.value,
          [child.uuid]: child,
        });
      },
      setSerializedStateForChild: (id: string, childState: SerializedPanelState<object>) => {
        currentChildState.current[id] = childState;
      },
      getSerializedStateForChild: (id: string) => currentChildState.current[id],
      lastSavedStateForChild$: (id: string) => {
        return lastSavedChildState$Ref.current.pipe(map((lastSavedState) => lastSavedState[id]));
      },
      getLastSavedStateForChild: (id: string) => lastSavedChildState$Ref.current.getValue()[id],
      appliedFilters$: combineCompatibleChildrenApis<AppliesFilters, Filter[] | undefined>(
        { children$: children$Ref.current },
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
        { children$: children$Ref.current },
        'esqlVariable$',
        apiPublishesESQLVariable,
        []
      ),
      timeslice$: new BehaviorSubject(undefined),
    };
  }, [state, lastSavedChildState$Ref]);

  return childrenApi;
};
