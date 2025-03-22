/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BehaviorSubject,
  Subject,
  combineLatest,
  combineLatestWith,
  debounceTime,
  map,
} from 'rxjs';
import {
  apiHasLastSavedChildState,
  childrenUnsavedChanges$,
  HasLastSavedChildState,
  type PresentationContainer,
} from '@kbn/presentation-containers';
import deepEqual from 'fast-deep-equal';
import {
  apiPublishesUnsavedChanges,
  SerializedPanelState,
  type PublishesUnsavedChanges,
  type StateComparators,
  latestComparatorValues$,
} from '@kbn/presentation-publishing';
import {
  CONTROL_GROUP_STATIC_ID,
  type ControlGroupRuntimeState,
  type ControlGroupSerializedState,
  type ControlPanelsState,
  DefaultControlState,
} from '../../common';
import { apiPublishesAsyncFilters } from '../controls/data_controls/publishes_async_filters';
import { getControlsInOrder, type ControlsInOrder } from './init_controls_manager';
import { deserializeControlGroup } from './utils/serialization_utils';
import { CHANGE_CHECK_DEBOUNCE } from '../constants';

export type ControlGroupComparatorState = Pick<
  ControlGroupRuntimeState,
  'autoApplySelections' | 'chainingSystem' | 'ignoreParentSettings' | 'labelPosition'
> & {
  controlsInOrder: ControlsInOrder;
};

const compareControlGroupSerializedState = (
  currentState: SerializedPanelState<ControlGroupSerializedState>,
  lastSavedState?: SerializedPanelState<ControlGroupSerializedState>
) => {
  // clone via serialization to deeply remove undefined values
  const { controls: currentControls, ...currentStateToCompare } = JSON.parse(
    JSON.stringify(currentState.rawState ?? {})
  ) as ControlGroupSerializedState;
  const { controls: lastControls, ...lastSavedStateToCompare } = JSON.parse(
    JSON.stringify(lastSavedState?.rawState ?? {})
  ) as ControlGroupSerializedState;
  return !deepEqual(currentStateToCompare, lastSavedStateToCompare);
};

export function initializeControlGroupUnsavedChanges(
  applySelections: () => void,
  children$: PresentationContainer['children$'],
  comparators: StateComparators<ControlGroupComparatorState>,
  resetControlsUnsavedChanges: (lastSavedChildControlsState: ControlPanelsState) => void,
  parentApi: unknown,
  serializeState: () => SerializedPanelState<ControlGroupSerializedState>
): {
  api: PublishesUnsavedChanges & HasLastSavedChildState<DefaultControlState>;
  cleanup: () => void;
} {
  if (!apiHasLastSavedChildState<ControlGroupSerializedState>(parentApi)) {
    return {
      api: {
        resetUnsavedChanges: () => {},
        saveNotification$: new Subject<void>(),
        hasUnsavedChanges$: new BehaviorSubject(false),
        getLastSavedStateForChild: (uuid: string) => undefined,
      },
      cleanup: () => {},
    };
  }

  const getLastSavedState = () => parentApi.getLastSavedStateForChild(CONTROL_GROUP_STATIC_ID);
  const initialLastSavedState = getLastSavedState();
  let lastSavedRuntimeState: ControlGroupRuntimeState | undefined = initialLastSavedState
    ? deserializeControlGroup(initialLastSavedState)
    : undefined;
  const saveNotification$ = new Subject<void>();
  const controlGroupLastSavedState$ = new BehaviorSubject<
    SerializedPanelState<ControlGroupSerializedState> | undefined
  >(initialLastSavedState);
  const subscriptions = parentApi.saveNotification$.subscribe(() => {
    const lastSavedSerializedState = getLastSavedState();
    controlGroupLastSavedState$.next(lastSavedSerializedState);
    if (lastSavedSerializedState) {
      lastSavedRuntimeState = deserializeControlGroup(lastSavedSerializedState);
    }
    saveNotification$.next();
  });

  const hasUnsavedChanges$ = new BehaviorSubject(
    compareControlGroupSerializedState(serializeState(), getLastSavedState())
  );

  const controlsChildrenHaveUnsavedChanges$ = childrenUnsavedChanges$(children$).pipe(
    map((childUnsavedChanges) => childUnsavedChanges.some((change) => change.hasUnsavedChanges))
  );

  const controlGroupHasUnsavedChanges$ = latestComparatorValues$(comparators).pipe(
    map(() => serializeState()),
    combineLatestWith(controlGroupLastSavedState$),
    map(([currentState, lastSavedState]) =>
      compareControlGroupSerializedState(currentState, lastSavedState)
    )
  );

  subscriptions.add(
    combineLatest([controlGroupHasUnsavedChanges$, controlsChildrenHaveUnsavedChanges$])
      .pipe(
        debounceTime(CHANGE_CHECK_DEBOUNCE),
        map(
          ([controlGroupHasUnsavedChanges, controlsChildrenHaveUnsavedChanges]) =>
            controlGroupHasUnsavedChanges || controlsChildrenHaveUnsavedChanges
        )
      )
      .subscribe((hasUnsavedChanges) => hasUnsavedChanges$.next(hasUnsavedChanges))
  );

  return {
    api: {
      hasUnsavedChanges$,
      resetUnsavedChanges: async () => {
        if (!lastSavedRuntimeState || !hasUnsavedChanges$.value) return;
        const lastSavedComparatorState: ControlGroupComparatorState = {
          autoApplySelections: lastSavedRuntimeState.autoApplySelections,
          chainingSystem: lastSavedRuntimeState.chainingSystem,
          controlsInOrder: getControlsInOrder(lastSavedRuntimeState.initialChildControlState),
          ignoreParentSettings: lastSavedRuntimeState.ignoreParentSettings,
          labelPosition: lastSavedRuntimeState.labelPosition,
        };
        for (const key of Object.keys(comparators) as Array<keyof ControlGroupComparatorState>) {
          const setter = comparators[key][1] as (
            value: ControlGroupComparatorState[keyof ControlGroupComparatorState]
          ) => void;
          setter(lastSavedComparatorState[key]);
        }

        resetControlsUnsavedChanges(lastSavedRuntimeState.initialChildControlState);

        const filtersReadyPromises: Array<Promise<void>> = [];
        Object.values(children$.value).forEach((controlApi) => {
          if (apiPublishesUnsavedChanges(controlApi)) controlApi.resetUnsavedChanges();
          if (apiPublishesAsyncFilters(controlApi)) {
            filtersReadyPromises.push(controlApi.untilFiltersReady());
          }
        });

        await Promise.all(filtersReadyPromises);
        if (!comparators.autoApplySelections[0].value) {
          applySelections();
        }
      },
      saveNotification$,
      getLastSavedStateForChild: (uuid: string) => {
        const { type, order, id, enhancements, ...rawState } = (lastSavedRuntimeState
          ?.initialChildControlState[uuid] ?? {}) as ControlPanelsState & {
          enhancements?: object; // controls may have an enhancements key which throws off the diffing
          id?: string; // controls may have an id key which throws off the diffing
        };
        return rawState ? { rawState } : undefined;
      },
    },
    cleanup: () => subscriptions.unsubscribe(),
  };
}
