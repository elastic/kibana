/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { map } from 'rxjs';

import { UseEuiTheme } from '@elastic/eui';
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
  controls: 'deepEquality',
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
        const onResizeObserver = useMemo(() => {
          return new ResizeObserver((entries) => {
            for (const entry of entries) {
              if (Math.ceil(entry.contentRect.width) < 224) console.log(entry.contentRect.width);
              entry.target.classList[Math.ceil(entry.contentRect.width) < 224 ? 'add' : 'remove'](
                'controlGroup--truncated'
              );
            }
          });
        }, []);

        useEffect(() => {
          return () => {
            onResizeObserver.disconnect();
          };
        }, [onResizeObserver]);

        return (
          <div
            css={styles}
            className={'eui-yScroll'}
            ref={(ref) => {
              if (ref) onResizeObserver.observe(ref);
            }}
          >
            {Object.values(initialState.rawState.controls).map(({ width }, i) => {
              return (
                <div key={`control-${i}`} className={`singleControl singleControl-${width}`}>
                  {width}
                </div>
              );
            })}
          </div>
        );
      },
    };
  },
};

const styles = ({ euiTheme }: UseEuiTheme) =>
  css({
    width: '100%',
    display: 'flex',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    padding: euiTheme.size.s,
    gap: euiTheme.size.s,
    '.singleControl': {
      width: '100%',
      height: euiTheme.size.xl,
      '&-small': {
        maxWidth: `calc(${euiTheme.size.xl} * 7)`, // 224px
        backgroundColor: euiTheme.colors.backgroundBaseAccent,
      },
      '&-medium': {
        maxWidth: `calc(${euiTheme.size.xxl} * 10)`, // 400px
        backgroundColor: euiTheme.colors.backgroundBaseWarning,
      },
      '&-large': {
        maxWidth: `calc(${euiTheme.size.xxl} * 20)`, // 800px
        backgroundColor: euiTheme.colors.backgroundBaseAccentSecondary,
      },
    },
  });
