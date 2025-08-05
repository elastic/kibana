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

import { EuiButtonIcon, EuiPopover, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { CoreStart } from '@kbn/core/public';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import {
  SerializedPanelState,
  SerializedTitles,
  StateComparators,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { StateManager } from '@kbn/presentation-publishing/state_manager/types';

import { openControlEditor } from './actions/open_control_editor';
import { CONTROL_PANEL_ID } from './constants';
import { OptionsList } from './controls/options_list_control';
import { RangeSlider } from './controls/range_slider_control';
import {
  ControlGroupApi,
  ControlGroupSerializedState,
  ControlGroupAttributes,
  ControlGroupRuntimeState,
} from './types';

const controlComparators: StateComparators<ControlGroupAttributes> = {
  controls: 'deepEquality',
};

const defaultControlGroupAttributes: WithAllKeys<ControlGroupAttributes> = {
  controls: {},
};

const deserializeState = async (
  serializedState: SerializedPanelState<ControlGroupSerializedState>
): Promise<ControlGroupRuntimeState> => {
  const titlesState: SerializedTitles = {
    title: serializedState.rawState.title,
    hidePanelTitles: serializedState.rawState.hidePanelTitles,
    description: serializedState.rawState.description,
  };
  const attributes: ControlGroupAttributes = serializedState.rawState.attributes;
  return {
    ...titlesState,
    ...attributes,
  };
};

export const getControlPanelEmbeddableFactory: (
  core: CoreStart
) => EmbeddableFactory<ControlGroupSerializedState, ControlGroupApi> = (core) => {
  return {
    type: CONTROL_PANEL_ID,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const state = await deserializeState(initialState);
      console.log(state);
      const titleManager = initializeTitleManager(initialState.rawState);
      const controlPanelStateManager = initializeStateManager<ControlGroupRuntimeState>(
        state,
        defaultControlGroupAttributes
      );

      console.log(controlPanelStateManager.getLatestState());

      const serializeState = () => {
        return {
          rawState: {
            ...titleManager.getLatestState(),
            attributes: {
              ...controlPanelStateManager.getLatestState(),
            },
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

      const api = finalizeApi({
        ...titleManager.api,
        ...controlPanelStateManager.api,
        ...unsavedChangesApi,
        serializeState,

        addNewPanel: async (panel) => {
          console.log('HEREEE');
          return new Promise((resolve) => {
            resolve(undefined);
          });
        },

        getTypeDisplayName: () => {
          return i18n.translate('controls.typeDisplayName', {
            defaultMessage: 'controls',
          });
        },
        isEditingEnabled: () => true,
        onEdit: async () => {
          openControlEditor({
            stateManager: controlPanelStateManager,
            isCreate: false,
            core,
            api,
          }).then((result) => {
            console.log('here');
            // const nextIsByReference = Boolean(result.savedBookId);

            // // if the by reference state has changed during this edit, reinitialize the panel.
            // if (nextIsByReference !== isByReference && apiIsPresentationContainer(api.parentApi)) {
            //   api.parentApi.replacePanel<BookSerializedState>(api.uuid, {
            //     serializedState: serializeBook(nextIsByReference, result.savedBookId),
            //     panelType: api.type,
            //   });
            // }
          });
        },
      });

      return {
        api,
        Component: () => {
          const [controls] = useBatchedPublishingSubjects(controlPanelStateManager.api.controls$);

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
                    height: 'fit-content',
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
                      aria-label="View controls"
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
                    {Object.values(controls).map(({ type }, i) => {
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
                  {Object.values(controls).map(({ type }, i) => {
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
};
