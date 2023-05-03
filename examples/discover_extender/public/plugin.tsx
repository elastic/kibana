/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiContextMenu,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiWrappingPopover,
} from '@elastic/eui';
import type { CoreStart, Plugin, SimpleSavedObject } from '@kbn/core/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import useObservable from 'react-use/lib/useObservable';

export interface DiscoverExtenderStartPlugins {
  discover: DiscoverStart;
}

export class DiscoverExtenderPlugin implements Plugin {
  setup() {}

  start(core: CoreStart, plugins: DiscoverExtenderStartPlugins) {
    const { discover } = plugins;

    discover.customize('default', ({ customizations }) => {
      customizations.set({
        id: 'top_nav',
        defaultMenu: {
          options: { order: 100 },
          new: { order: 200 },
          open: { order: 300 },
          share: { order: 400 },
          alerts: { order: 500 },
          inspect: { order: 600 },
          save: { order: 800 },
        },
        getMenuItems: () => [
          {
            data: {
              id: 'logsExplorer',
              label: 'Logs explorer',
              iconType: 'logsApp',
              run: () => {
                discover.locator?.navigate({ profile: 'extender' });
              },
            },
            order: 700,
          },
        ],
      });

      return () => {
        // eslint-disable-next-line no-console
        console.log('Cleaning up Document explorer customizations');
      };
    });

    let isOptionsOpen = false;
    const optionsContainer = document.createElement('div');
    const closeOptionsPopover = () => {
      ReactDOM.unmountComponentAtNode(optionsContainer);
      document.body.removeChild(optionsContainer);
      isOptionsOpen = false;
    };

    discover.customize('extender', async ({ customizations, stateContainer }) => {
      customizations.set({
        id: 'top_nav',
        defaultMenu: {
          options: { disabled: true },
          new: { disabled: true },
          open: { disabled: true },
          share: { order: 200 },
          alerts: { disabled: true },
          inspect: { disabled: true },
          save: { order: 400 },
        },
        getMenuItems: () => [
          {
            data: {
              id: 'options',
              label: 'Options',
              iconType: 'arrowDown',
              iconSide: 'right',
              run: (anchorElement: HTMLElement) => {
                if (isOptionsOpen) {
                  closeOptionsPopover();
                  return;
                }

                isOptionsOpen = true;
                document.body.appendChild(optionsContainer);

                const element = (
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
                    />
                  </EuiWrappingPopover>
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
              run: () => {
                discover.locator?.navigate({});
              },
            },
            order: 300,
          },
        ],
      });

      customizations.set({
        id: 'search_bar',
        CustomDataViewPicker: () => {
          const [isPopoverOpen, setIsPopoverOpen] = useState(false);
          const togglePopover = () => setIsPopoverOpen((open) => !open);
          const closePopover = () => setIsPopoverOpen(false);
          const [savedSearches, setSavedSearches] = useState<SimpleSavedObject[]>([]);

          useEffect(() => {
            core.savedObjects.client.find({ type: 'search' }).then((response) => {
              setSavedSearches(response.savedObjects);
            });
          }, []);

          const currentSavedSearch = useObservable(
            stateContainer.savedSearchState.getCurrent$(),
            stateContainer.savedSearchState.getState()
          );

          return (
            <EuiPopover
              button={
                <EuiButton iconType="arrowDown" iconSide="right" onClick={togglePopover}>
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
                    })),
                  },
                ]}
              />
            </EuiPopover>
          );
        },
      });

      customizations.set({
        id: 'field_popover',
        CustomBottomButton: () => (
          <EuiButton
            color="success"
            size="s"
            iconType="machineLearningApp"
            onClick={() => alert('Categorize flyout opened')}
          >
            Categorize
          </EuiButton>
        ),
      });

      const { MoreMenuCell } = await import('./more_menu_cell');

      customizations.set({
        id: 'data_grid',
        defaultLeadingControlColumns: {
          select: { disabled: true },
        },
        getLeadingControlColumns: () => [
          {
            id: 'moreMenu',
            width: 24,
            headerCellRender: () => (
              <EuiScreenReaderOnly>
                <span>More menu</span>
              </EuiScreenReaderOnly>
            ),
            rowCellRender: MoreMenuCell,
          },
        ],
      });

      return () => {
        // eslint-disable-next-line no-console
        console.log('Cleaning up Logs explorer customizations');
      };
    });
  }
}
