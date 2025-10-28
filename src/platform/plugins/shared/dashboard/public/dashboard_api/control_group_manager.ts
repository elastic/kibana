/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { ControlGroupApi } from '@kbn/controls-plugin/public';
import { BehaviorSubject, first, from, skipWhile, startWith, switchMap } from 'rxjs';

export const CONTROL_GROUP_EMBEDDABLE_ID = 'CONTROL_GROUP_EMBEDDABLE_ID';

export function initializeControlGroupManager(
  initialState: ControlsGroupState | undefined,
  getReferences: (id: string) => Reference[]
) {
  const controlGroupApi$ = new BehaviorSubject<ControlGroupApi | undefined>(undefined);

  async function untilControlsInitialized(): Promise<void> {
    return new Promise((resolve) => {
      controlGroupApi$
        .pipe(
          skipWhile((controlGroupApi) => !controlGroupApi),
          switchMap(async (controlGroupApi) => {
            await controlGroupApi?.untilFiltersPublished();
          }),
          first()
        )
        .subscribe(() => {
          resolve();
        });
    });
  }

  const unPauseWhenControlsAreAvailable = async () => {
    await untilControlsInitialized();
    return false;
  };
  const isFetchPaused$ = from(unPauseWhenControlsAreAvailable()).pipe(startWith(true));

  return {
    api: {
      controlGroupApi$,
      isFetchPaused$,
    },
    internalApi: {
      getStateForControlGroup: () => {
        return {
          rawState: initialState
            ? initialState
            : ({
                autoApplySelections: true,
                chainingSystem: 'HIERARCHICAL',
                controls: [],
                ignoreParentSettings: {
                  ignoreFilters: false,
                  ignoreQuery: false,
                  ignoreTimerange: false,
                  ignoreValidations: false,
                },
                labelPosition: 'oneLine',
              } as ControlsGroupState),
          references: getReferences(CONTROL_GROUP_EMBEDDABLE_ID),
        };
      },
      serializeControlGroup: () => {
        const serializedState = controlGroupApi$.value?.serializeState();
        return {
          controlGroupInput: serializedState?.rawState,
          controlGroupReferences: serializedState?.references ?? [],
        };
      },
      setControlGroupApi: (controlGroupApi: ControlGroupApi) =>
        controlGroupApi$.next(controlGroupApi),
    },
  };
}
