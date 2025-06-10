/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { map } from 'rxjs';

import { css } from '@emotion/react';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import {
  StateComparators,
  initializeTitleManager,
  titleComparators,
} from '@kbn/presentation-publishing';

import { CONTROL_PANEL_ID } from './constants';
import { ControlGroupApi, ControlGroupSerializedState, ControlsGroupInternalState } from './types';

const controlComparators: StateComparators<ControlsGroupInternalState> = {
  controlCount: 'referenceEquality',
};

export const controlPanelEmbeddableFactory: EmbeddableFactory<
  ControlGroupSerializedState,
  ControlGroupApi
> = {
  type: CONTROL_PANEL_ID,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const titleManager = initializeTitleManager(initialState.rawState);

    const serializeState = () => {
      return {
        rawState: {
          ...titleManager.getLatestState(),
          ...initialState.rawState,
        },
      };
    };

    const unsavedChangesApi = initializeUnsavedChanges({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: titleManager.anyStateChange$.pipe(map(() => undefined)),
      getComparators: () => {
        return { ...titleComparators, ...controlComparators };
      },
      onReset: (lastSaved) => {
        titleManager.reinitializeState(lastSaved?.rawState);
      },
    });

    const api = finalizeApi({ ...titleManager.api, ...unsavedChangesApi, serializeState });

    return {
      api,
      Component: () => {
        const count = initialState.rawState.controlCount;
        return (
          <>
            {new Array(count).fill('').map((_, i) => {
              return (
                <div css={styles} key={`control-${i}`}>
                  Here
                </div>
              );
            })}
          </>
        );
      },
    };
  },
};

const styles = css({
  backgroundColor: 'red',
});
