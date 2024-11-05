/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import React, { useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { BehaviorSubject, Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiProvider,
  EuiSpacer,
} from '@elastic/eui';
import { AppMountParameters } from '@kbn/core-application-browser';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import {
  SearchApi,
  SearchSerializedState,
} from '@kbn/embeddable-examples-plugin/public/react_embeddables/search/types';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { GridLayout, GridLayoutData, type GridLayoutApi, isLayoutEqual } from '@kbn/grid-layout';
import { i18n } from '@kbn/i18n';

import { getPanelId } from './get_panel_id';
import {
  clearSerializedGridLayout,
  getSerializedGridLayout,
  setSerializedGridLayout,
} from './serialized_grid_layout';

const DASHBOARD_MARGIN_SIZE = 8;
const DASHBOARD_GRID_HEIGHT = 20;
const DASHBOARD_GRID_COLUMN_COUNT = 48;
const DEFAULT_PANEL_HEIGHT = 15;
const DEFAULT_PANEL_WIDTH = DASHBOARD_GRID_COLUMN_COUNT / 2;

export const GridExample = ({ coreStart }: { coreStart: CoreStart }) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const [layoutKey, setLayoutKey] = useState<string>(uuidv4());
  const [gridLayoutApi, setGridLayoutApi] = useState<GridLayoutApi | null>();
  const savedLayout = useRef<GridLayoutData>(getSerializedGridLayout());
  const currentLayout = useRef<GridLayoutData>(savedLayout.current);

  const parentApi = useMemo(() => {
    return {
      // behaviour subjeect for drag handle references?
      viewMode: new BehaviorSubject('edit'),
      reload$: new Subject<void>(),
      getSerializedStateForChild: () => ({
        rawState: {
          title: 'test',
          timeRange: undefined,
        },
        references: [],
      }),
      timeRange$: new BehaviorSubject<TimeRange>({
        from: 'now-24h',
        to: 'now',
      }),
      removePanel: () => {},
      replacePanel: () => {},
      addNewPanel: () => {},
      canRemovePanels: () => true,
      children$: new BehaviorSubject(null),
    };
    // only run onMount
  }, []);

  return (
    <EuiProvider>
      <EuiPageTemplate grow={false} offset={0} restrictWidth={false}>
        <EuiPageTemplate.Header
          iconType={'dashboardApp'}
          pageTitle={i18n.translate('examples.gridExample.pageTitle', {
            defaultMessage: 'Grid Layout Example',
          })}
        />
        <EuiPageTemplate.Section color="subdued">
          <EuiCallOut
            title={i18n.translate('examples.gridExample.sessionStorageCallout', {
              defaultMessage:
                'This example uses session storage to persist saved state and unsaved changes',
            })}
          >
            <EuiButton
              color="accent"
              size="s"
              onClick={() => {
                clearSerializedGridLayout();
                window.location.reload();
              }}
            >
              {i18n.translate('examples.gridExample.resetExampleButton', {
                defaultMessage: 'Reset example',
              })}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={async () => {
                  const panelId = await getPanelId({
                    coreStart,
                    suggestion: `panel${(gridLayoutApi?.getPanelCount() ?? 0) + 1}`,
                  });
                  if (panelId)
                    gridLayoutApi?.addPanel(panelId, {
                      width: DEFAULT_PANEL_WIDTH,
                      height: DEFAULT_PANEL_HEIGHT,
                    });
                }}
              >
                {i18n.translate('examples.gridExample.addPanelButton', {
                  defaultMessage: 'Add a panel',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                {hasUnsavedChanges && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="warning">
                      {i18n.translate('examples.gridExample.unsavedChangesBadge', {
                        defaultMessage: 'Unsaved changes',
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => {
                      currentLayout.current = cloneDeep(savedLayout.current);
                      setHasUnsavedChanges(false);
                      setLayoutKey(uuidv4()); // force remount of grid
                    }}
                  >
                    {i18n.translate('examples.gridExample.resetLayoutButton', {
                      defaultMessage: 'Reset',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={() => {
                      if (gridLayoutApi) {
                        const layoutToSave = gridLayoutApi.serializeState();
                        setSerializedGridLayout(layoutToSave);
                        savedLayout.current = layoutToSave;
                        setHasUnsavedChanges(false);
                      }
                    }}
                  >
                    {i18n.translate('examples.gridExample.saveLayoutButton', {
                      defaultMessage: 'Save',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <GridLayout
            key={layoutKey}
            onLayoutChange={(newLayout) => {
              currentLayout.current = cloneDeep(newLayout);
              setHasUnsavedChanges(!isLayoutEqual(savedLayout.current, newLayout));
            }}
            ref={setGridLayoutApi}
            renderPanelContents={(id, setDragHandles) => {
              // console.log('RENDER PANEL', id);
              // return <div style={{ padding: 8 }}>{id}</div>;

              return (
                <ReactEmbeddableRenderer<SearchSerializedState, SearchApi>
                  type={'searchEmbeddableDemo'}
                  getParentApi={() => parentApi}
                  panelProps={{
                    showBadges: true,
                    showBorder: false,
                    showNotifications: true,
                    showShadow: false,
                    setDragHandles,
                  }}
                />
              );
            }}
            getCreationOptions={() => {
              return {
                gridSettings: {
                  gutterSize: DASHBOARD_MARGIN_SIZE,
                  rowHeight: DASHBOARD_GRID_HEIGHT,
                  columnCount: DASHBOARD_GRID_COLUMN_COUNT,
                },
                initialLayout: cloneDeep(currentLayout.current),
              };
            }}
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </EuiProvider>
  );
};

export const renderGridExampleApp = (
  element: AppMountParameters['element'],
  coreStart: CoreStart
) => {
  ReactDOM.render(<GridExample coreStart={coreStart} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
