/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { map } from 'rxjs';

import { UseEuiTheme, EuiPopover, EuiButton, EuiButtonIcon } from '@elastic/eui';
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
import { OptionsList } from './controls/options_list_control';
import { RangeSlider } from './controls/range_slider_control';

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
        const [layout, setLayout] = useState<'compressed' | 'normal' | 'popover'>('normal');
        const [popoverOpen, setPopoverOpen] = useState<boolean>(false);

        const onResizeObserver = useMemo(() => {
          return new ResizeObserver((entries) => {
            for (const entry of entries) {
              if (entry.contentRect.width < 140) {
                setLayout('popover');
              } else if (entry.contentRect.width < 224 + 16) {
                setLayout('compressed');
              } else {
                setLayout('normal');
              }
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
            css={({ euiTheme }: UseEuiTheme) =>
              css({
                width: '100%',
                padding: euiTheme.size.s,
                display: 'flex',
                alignContent: 'flex-start',
              })
            }
            className={'eui-yScroll'}
            ref={(ref) => {
              /**
               * we have to observe the parent element here so that we don't get into an infinite
               * scrollbar vs no scrollbar resize loop
               */
              if (ref && ref.parentElement) onResizeObserver.observe(ref.parentElement);
            }}
          >
            {layout === 'popover' ? (
              <EuiPopover
                css={css({
                  width: '100%',
                })}
                button={
                  <EuiButtonIcon
                    color={'text'}
                    display={'base'}
                    size={'s'}
                    iconSize={'m'}
                    onClick={() => {
                      setPopoverOpen(!popoverOpen);
                    }}
                    iconType="controls"
                    aria-label="Open documentation"
                    css={css`
                      width: 100%;
                    `}
                  />
                }
                isOpen={popoverOpen}
                closePopover={() => {
                  setPopoverOpen(false);
                }}
                repositionOnScroll={false}
              >
                <div
                  css={({ euiTheme }: UseEuiTheme) =>
                    css({
                      maxWidth: '600px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignContent: 'flex-start',
                      padding: euiTheme.size.s,
                      gap: euiTheme.size.s,
                    })
                  }
                >
                  {Object.values(initialState.rawState.controls).map(({ type }, i) => {
                    switch (type) {
                      case 'optionsList': {
                        return <OptionsList key={`control-${i}`} controlSize={'normal'} />;
                      }
                      case 'rangeSlider': {
                        return <RangeSlider key={`control-${i}`} controlSize={'normal'} />;
                      }
                    }
                  })}
                </div>
              </EuiPopover>
            ) : (
              <div
                css={({ euiTheme }: UseEuiTheme) =>
                  css({
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignContent: 'flex-start',
                    margin: 'auto',

                    gap: euiTheme.size.s,
                  })
                }
              >
                {Object.values(initialState.rawState.controls).map(({ type }, i) => {
                  switch (type) {
                    case 'optionsList': {
                      return <OptionsList key={`control-${i}`} controlSize={layout} />;
                    }
                    case 'rangeSlider': {
                      return <RangeSlider key={`control-${i}`} controlSize={layout} />;
                    }
                  }
                })}
              </div>
            )}
          </div>
        );
      },
    };
  },
};
