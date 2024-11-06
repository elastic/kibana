/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiContextMenu,
  EuiFlexItem,
  EuiPopover,
  EuiWrappingPopover,
  IconType,
} from '@elastic/eui';
import { CoreSetup, CoreStart, Plugin, SimpleSavedObject } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type {
  CustomizationCallback,
  DiscoverSetup,
  DiscoverStart,
} from '@kbn/discover-plugin/public';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import useObservable from 'react-use/lib/useObservable';
import { ControlGroupRendererApi, ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { css } from '@emotion/react';
import type { ControlPanelsState } from '@kbn/controls-plugin/common';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import image from './discover_customization_examples.png';

export interface DiscoverCustomizationExamplesSetupPlugins {
  developerExamples: DeveloperExamplesSetup;
  discover: DiscoverSetup;
}

export interface DiscoverCustomizationExamplesStartPlugins {
  discover: DiscoverStart;
  data: DataPublicPluginStart;
}

const PLUGIN_ID = 'discoverCustomizationExamples';
const PLUGIN_NAME = 'Discover Customizations';

export class DiscoverCustomizationExamplesPlugin implements Plugin {
  private customizationCallback: CustomizationCallback = () => {};

  setup(
    core: CoreSetup<DiscoverCustomizationExamplesStartPlugins, void>,
    plugins: DiscoverCustomizationExamplesSetupPlugins
  ) {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      visibleIn: [],
      mount: async (appMountParams) => {
        const [_, { discover, data }] = await core.getStartServices();

        ReactDOM.render(
          <I18nProvider>
            <KibanaThemeProvider theme={core.theme}>
              <Router history={appMountParams.history}>
                <Routes>
                  <Route>
                    <discover.DiscoverContainer
                      overrideServices={{
                        setHeaderActionMenu: appMountParams.setHeaderActionMenu,
                      }}
                      scopedHistory={appMountParams.history}
                      customizationCallbacks={[this.customizationCallback]}
                    />
                  </Route>
                </Routes>
              </Router>
            </KibanaThemeProvider>
          </I18nProvider>,
          appMountParams.element
        );

        return () => {
          // work around race condition between unmount effect and current app id
          // observable in the search session service
          data.search.session.clear();

          ReactDOM.unmountComponentAtNode(appMountParams.element);
        };
      },
    });

    plugins.developerExamples.register({
      appId: PLUGIN_ID,
      title: PLUGIN_NAME,
      description: 'Example plugin that uses the Discover customization framework.',
      image,
    });
  }

  start(core: CoreStart, plugins: DiscoverCustomizationExamplesStartPlugins) {
    const { discover } = plugins;

    let isOptionsOpen = false;
    const optionsContainer = document.createElement('div');
    const closeOptionsPopover = () => {
      ReactDOM.unmountComponentAtNode(optionsContainer);
      document.body.removeChild(optionsContainer);
      isOptionsOpen = false;
    };

    this.customizationCallback = ({ customizations, stateContainer }) => {
      customizations.set({
        id: 'top_nav',
        defaultMenu: {
          newItem: { disabled: true },
          openItem: { disabled: true },
          shareItem: { order: 200 },
          alertsItem: { disabled: true },
          inspectItem: { disabled: true },
          saveItem: { order: 400 },
        },
        getMenuItems: () => [
          {
            data: {
              id: 'options',
              label: 'Options',
              iconType: 'arrowDown',
              iconSide: 'right',
              testId: 'customOptionsButton',
              run: (anchorElement: HTMLElement) => {
                if (isOptionsOpen) {
                  closeOptionsPopover();
                  return;
                }

                isOptionsOpen = true;
                document.body.appendChild(optionsContainer);

                const element = (
                  <KibanaRenderContextProvider {...core}>
                    <EuiWrappingPopover
                      ownFocus
                      button={anchorElement}
                      isOpen={true}
                      panelPaddingSize="s"
                      closePopover={closeOptionsPopover}
                    >
                      <EuiContextMenu
                        size="s"
                        initialPanelId={0}
                        panels={[
                          {
                            id: 0,
                            items: [
                              {
                                name: 'Create new',
                                icon: 'plusInCircle',
                                onClick: () => alert('Create new clicked'),
                              },
                              {
                                name: 'Make a copy',
                                icon: 'copy',
                                onClick: () => alert('Make a copy clicked'),
                              },
                              {
                                name: 'Manage saved searches',
                                icon: 'gear',
                                onClick: () => alert('Manage saved searches clicked'),
                              },
                            ],
                          },
                        ]}
                        data-test-subj="customOptionsPopover"
                      />
                    </EuiWrappingPopover>
                  </KibanaRenderContextProvider>
                );

                ReactDOM.render(element, optionsContainer);
              },
            },
            order: 100,
          },
          {
            data: {
              id: 'documentExplorer',
              label: 'Document explorer',
              iconType: 'discoverApp',
              testId: 'documentExplorerButton',
              run: () => {
                discover.locator?.navigate({});
              },
            },
            order: 300,
          },
        ],
        getBadges: () => {
          return [
            {
              data: {
                badgeText: 'Example badge',
                color: 'warning',
              },
              order: 10,
            },
          ];
        },
      });

      customizations.set({
        id: 'search_bar',
        CustomDataViewPicker: () => {
          const [isPopoverOpen, setIsPopoverOpen] = useState(false);
          const togglePopover = () => setIsPopoverOpen((open) => !open);
          const closePopover = () => setIsPopoverOpen(false);
          const [savedSearches, setSavedSearches] = useState<
            Array<SimpleSavedObject<{ title: string }>>
          >([]);

          useEffect(() => {
            core.savedObjects.client
              .find<{ title: string }>({ type: 'search' })
              .then((response) => {
                setSavedSearches(response.savedObjects);
              });
          }, []);

          const currentSavedSearch = useObservable(
            stateContainer.savedSearchState.getCurrent$(),
            stateContainer.savedSearchState.getState()
          );

          return (
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiButton
                    iconType="arrowDown"
                    iconSide="right"
                    fullWidth
                    onClick={togglePopover}
                    data-test-subj="logsViewSelectorButton"
                  >
                    {currentSavedSearch.title ?? 'None selected'}
                  </EuiButton>
                }
                isOpen={isPopoverOpen}
                panelPaddingSize="none"
                closePopover={closePopover}
              >
                <EuiContextMenu
                  size="s"
                  initialPanelId={0}
                  panels={[
                    {
                      id: 0,
                      title: 'Saved logs views',
                      items: savedSearches.map((savedSearch) => ({
                        name: savedSearch.get('title'),
                        onClick: () => stateContainer.actions.onOpenSavedSearch(savedSearch.id),
                        icon: savedSearch.id === currentSavedSearch.id ? 'check' : 'empty',
                        'data-test-subj': `logsViewSelectorOption-${savedSearch.attributes.title.replace(
                          /[^a-zA-Z0-9]/g,
                          ''
                        )}`,
                      })),
                    },
                  ]}
                />
              </EuiPopover>
            </EuiFlexItem>
          );
        },
      });

      customizations.set({
        id: 'search_bar',
        CustomDataViewPicker: () => {
          const [isPopoverOpen, setIsPopoverOpen] = useState(false);
          const togglePopover = () => setIsPopoverOpen((open) => !open);
          const closePopover = () => setIsPopoverOpen(false);
          const [savedSearches, setSavedSearches] = useState<
            Array<SimpleSavedObject<{ title: string }>>
          >([]);

          useEffect(() => {
            core.savedObjects.client
              .find<{ title: string }>({ type: 'search' })
              .then((response) => {
                setSavedSearches(response.savedObjects);
              });
          }, []);

          const currentSavedSearch = useObservable(
            stateContainer.savedSearchState.getCurrent$(),
            stateContainer.savedSearchState.getState()
          );

          return (
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiButton
                    iconType="arrowDown"
                    iconSide="right"
                    fullWidth
                    onClick={togglePopover}
                    data-test-subj="logsViewSelectorButton"
                  >
                    {currentSavedSearch.title ?? 'None selected'}
                  </EuiButton>
                }
                isOpen={isPopoverOpen}
                panelPaddingSize="none"
                closePopover={closePopover}
              >
                <EuiContextMenu
                  size="s"
                  initialPanelId={0}
                  panels={[
                    {
                      id: 0,
                      title: 'Saved logs views',
                      items: savedSearches.map((savedSearch) => ({
                        name: savedSearch.get('title'),
                        onClick: () => stateContainer.actions.onOpenSavedSearch(savedSearch.id),
                        icon: savedSearch.id === currentSavedSearch.id ? 'check' : 'empty',
                        'data-test-subj': `logsViewSelectorOption-${savedSearch.attributes.title.replace(
                          /[^a-zA-Z0-9]/g,
                          ''
                        )}`,
                      })),
                    },
                  ]}
                />
              </EuiPopover>
            </EuiFlexItem>
          );
        },
        PrependFilterBar: () => {
          const [controlGroupAPI, setControlGroupAPI] = useState<
            ControlGroupRendererApi | undefined
          >();
          const stateStorage = stateContainer.stateStorage;
          const dataView = useObservable(
            stateContainer.internalState.state$,
            stateContainer.internalState.getState()
          ).dataView;

          useEffect(() => {
            if (!controlGroupAPI) {
              return;
            }

            const stateSubscription = stateStorage
              .change$<ControlPanelsState>('controlPanels')
              .subscribe((panels) =>
                controlGroupAPI.updateInput({ initialChildControlState: panels ?? undefined })
              );

            const inputSubscription = controlGroupAPI.getInput$().subscribe((input) => {
              if (input && input.initialChildControlState)
                stateStorage.set('controlPanels', input.initialChildControlState);
            });

            const filterSubscription = controlGroupAPI.filters$.subscribe((newFilters = []) => {
              stateContainer.internalState.transitions.setCustomFilters(newFilters);
              stateContainer.actions.fetchData();
            });

            return () => {
              stateSubscription.unsubscribe();
              inputSubscription.unsubscribe();
              filterSubscription.unsubscribe();
            };
          }, [controlGroupAPI, stateStorage]);

          const fieldToFilterOn = dataView?.fields.filter((field) =>
            field.esTypes?.includes('keyword')
          )[0];

          if (!fieldToFilterOn) {
            return null;
          }

          return (
            <EuiFlexItem
              data-test-subj="customPrependedFilter"
              grow={false}
              css={css`
                .controlGroup {
                  min-height: unset;
                }

                .euiFormLabel {
                  padding-top: 0;
                  padding-bottom: 0;
                  line-height: 32px !important;
                }

                .euiFormControlLayout {
                  height: 32px;
                }
              `}
            >
              <ControlGroupRenderer
                onApiAvailable={setControlGroupAPI}
                getCreationOptions={async (initialState, builder) => {
                  const panels = stateStorage.get<ControlPanelsState>('controlPanels');

                  if (!panels) {
                    builder.addOptionsListControl(initialState, {
                      dataViewId: dataView?.id!,
                      title: fieldToFilterOn.name.split('.')[0],
                      fieldName: fieldToFilterOn.name,
                      grow: false,
                      width: 'small',
                    });
                  }

                  return {
                    initialState: {
                      ...initialState,
                      initialChildControlState: panels ?? initialState.initialChildControlState,
                    },
                  };
                }}
                filters={stateContainer.appState.get().filters ?? []}
              />
            </EuiFlexItem>
          );
        },
      });

      customizations.set({
        id: 'flyout',
        size: 650,
        title: 'Example custom flyout',
        actions: {
          getActionItems: () =>
            Array.from({ length: 5 }, (_, i) => {
              const index = i + 1;
              return {
                id: `action-item-${index}`,
                enabled: true,
                label: `Action ${index}`,
                iconType: ['faceHappy', 'faceNeutral', 'faceSad', 'infinity', 'bell'].at(
                  i
                ) as IconType,
                dataTestSubj: `customActionItem${index}`,
                onClick: () => alert(index),
              };
            }),
        },
      });

      return () => {
        // eslint-disable-next-line no-console
        console.log('Cleaning up Logs explorer customizations');
      };
    };
  }
}
