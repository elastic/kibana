/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { omit } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';

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
  lastSavedState$Ref: React.MutableRefObject<BehaviorSubject<{ [id: string]: StickyControlState }>>
) => {
  const children$Ref = useRef(new BehaviorSubject<{ [id: string]: DefaultEmbeddableApi }>({}));
  const currentChildState$Ref = useRef(
    new BehaviorSubject<{ [id: string]: SerializedPanelState<object> }>({})
  );
  const lastSavedChildState$Ref = useRef(
    new BehaviorSubject<{ [id: string]: SerializedPanelState<object> }>({}) // derived from lastSavedState$Ref
  );

  useEffect(() => {
    /** Derive `lastSavedChildState$Ref` from `lastSavedState$Ref` */
    const lastSavedStateSubscription = lastSavedState$Ref.current.subscribe((lastSavedState) => {
      const serializedState: { [id: string]: SerializedPanelState<object> } = {};
      Object.entries(lastSavedState).forEach(([id, control]) => {
        serializedState[id] = { rawState: omit(control, ['grow', 'width', 'order']) };
      });
      lastSavedChildState$Ref.current.next(serializedState);
      currentChildState$Ref.current.next(serializedState);
    });

    return () => {
      lastSavedStateSubscription.unsubscribe();
    };
  }, [lastSavedState$Ref]);

  useEffect(() => {
    /** Keep `currentChildState` in sync with children's state */
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
          currentChildState$Ref.current.next(result);
        }
      });
    return () => {
      unsavedChangesSubscription.unsubscribe();
    };
  }, []);

  const childrenApi = useMemo(() => {
    if (!state) return; // don't return children API until state is initialized

    return {
      children$: children$Ref.current,
      registerChildApi: (child: DefaultEmbeddableApi) => {
        children$Ref.current.next({
          ...children$Ref.current.value,
          [child.uuid]: child,
        });
      },
      removeChild: (id: string) => {
        const children = { ...children$Ref.current.value };
        if (children[id]) {
          delete children[id];
          children$Ref.current.next(children);
        }
        const currentChildState = { ...currentChildState$Ref.current.getValue() };
        if (currentChildState[id]) {
          delete currentChildState[id];
          currentChildState$Ref.current.next(currentChildState);
        }
      },
      setSerializedStateForChild: (id: string, childState: SerializedPanelState<object>) => {
        currentChildState$Ref.current.getValue()[id] = childState;
      },
      getSerializedStateForChild: (id: string) => currentChildState$Ref.current.getValue()[id],
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

  return { childrenApi, currentChildState$Ref };
};
