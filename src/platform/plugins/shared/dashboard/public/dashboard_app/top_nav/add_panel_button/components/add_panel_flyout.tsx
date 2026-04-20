/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { i18n as i18nFn } from '@kbn/i18n';
import {
  EuiEmptyPrompt,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiFieldSearch,
  useEuiTheme,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DashboardApi } from '../../../../dashboard_api/types';
import type { MenuItem, MenuItemGroup } from '../types';
import { getMenuItemGroups } from '../get_menu_item_groups';
import { Groups } from './groups';
import { selectFeaturedVisualizationActions, FEATURED_ACTION_IDS } from './select_featured_items';
import { embeddableService } from '../../../../services/kibana_services';

type FlyoutTab = 'new' | 'library';

const TAB_NEW_ID = 'new' as const;
const TAB_LIBRARY_ID = 'library' as const;

function NewPanelContent({ dashboardApi }: { dashboardApi: DashboardApi }) {
  const { euiTheme } = useEuiTheme();

  const {
    value: groups,
    loading,
    error,
  } = useAsync(async () => {
    return await getMenuItemGroups(dashboardApi);
  }, [dashboardApi]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredGroups, setFilteredGroups] = useState<MenuItemGroup[]>([]);
  useEffect(() => {
    if (!searchTerm) {
      return setFilteredGroups(groups ?? []);
    }

    const q = searchTerm.toLowerCase();

    const currentGroups = groups ?? ([] as MenuItemGroup[]);
    setFilteredGroups(
      currentGroups
        .map((group) => {
          const groupMatch = group.title.toLowerCase().includes(q);

          const [itemsMatch, items] = group.items.reduce(
            (acc, item) => {
              const itemMatch = item.name.toLowerCase().includes(q);

              acc[0] = acc[0] || itemMatch;
              acc[1].push({
                ...item,
                isDisabled: !(groupMatch || itemMatch),
              });

              return acc;
            },
            [false, [] as MenuItem[]]
          );

          return {
            ...group,
            isDisabled: !(groupMatch || itemsMatch),
            items,
          };
        })
        .filter((group) => !group.isDisabled)
    );
  }, [groups, searchTerm]);

  const { lens, esql } = useMemo(
    () => selectFeaturedVisualizationActions(filteredGroups),
    [filteredGroups]
  );

  const groupsForList = useMemo(
    () =>
      filteredGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !FEATURED_ACTION_IDS.has(item.id)),
        }))
        .filter((group) => group.items.length > 0),
    [filteredGroups]
  );

  return (
    <EuiSkeletonText isLoading={loading}>
      <EuiFlexGroup direction="column" responsive={false} gutterSize="m">
        <EuiFlexItem
          grow={false}
          css={{
            position: 'sticky',
            top: euiTheme.size.m,
            zIndex: 1,
            boxShadow: `0 -${euiTheme.size.m} 0 4px ${euiTheme.colors.backgroundBasePlain}`,
          }}
        >
          <EuiForm component="form" fullWidth>
            <EuiFormRow css={{ backgroundColor: euiTheme.colors.backgroundBasePlain }}>
              <EuiFieldSearch
                autoFocus
                compressed
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                aria-label={i18nFn.translate(
                  'dashboard.editorMenu.addPanelFlyout.searchLabelText',
                  { defaultMessage: 'search field for panels' }
                )}
                data-test-subj="dashboardPanelSelectionFlyout__searchInput"
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
        {(lens || esql) && (
          <EuiFlexItem
            grow={false}
            css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.s }}
          >
            {lens && !lens.isDisabled && (
              <EuiPanel
                hasBorder
                paddingSize="none"
                onClick={lens.onClick}
                data-test-subj="dashboardAddPanelFeatured-visualization"
                css={{ cursor: 'pointer', padding: `${euiTheme.size.s} ${euiTheme.size.base}` }}
              >
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="visBarVertical" size="m" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>
                        {i18nFn.translate('dashboard.addPanelFlyout.featured.visualizationTitle', {
                          defaultMessage: 'Visualization',
                        })}
                      </strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {i18nFn.translate(
                        'dashboard.addPanelFlyout.featured.visualizationDescription',
                        { defaultMessage: 'Build charts using the point and click editor' }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            )}
            {esql && !esql.isDisabled && (
              <EuiPanel
                hasBorder
                paddingSize="none"
                onClick={esql.onClick}
                data-test-subj="dashboardAddPanelFeatured-esqlVisualization"
                css={{ cursor: 'pointer', padding: `${euiTheme.size.s} ${euiTheme.size.base}` }}
              >
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="editorCodeBlock" size="m" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>
                        {i18nFn.translate(
                          'dashboard.addPanelFlyout.featured.esqlVisualizationTitle',
                          { defaultMessage: 'Visualization (query)' }
                        )}
                      </strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {i18nFn.translate(
                        'dashboard.addPanelFlyout.featured.esqlVisualizationDescription',
                        { defaultMessage: 'Build charts with ES|QL' }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            )}
          </EuiFlexItem>
        )}
        <EuiFlexItem
          css={{
            minHeight: '20vh',
            ...(error
              ? {
                  justifyContent: 'center',
                  alignItems: 'center',
                }
              : {}),
          }}
        >
          {error ? (
            <EuiEmptyPrompt
              iconType="warning"
              iconColor="danger"
              body={
                <EuiText size="s" textAlign="center">
                  <FormattedMessage
                    id="dashboard.solutionToolbar.addPanelFlyout.loadingErrorDescription"
                    defaultMessage="An error occurred loading the available dashboard panels for selection"
                  />
                </EuiText>
              }
              data-test-subj="dashboardPanelSelectionErrorIndicator"
            />
          ) : (
            <Groups groups={groupsForList} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiSkeletonText>
  );
}

function LibraryContent({ dashboardApi }: { dashboardApi: DashboardApi }) {
  const {
    value: LibraryComponent,
    loading,
    error,
  } = useAsync(() => embeddableService.getAddFromLibraryContentComponent(), [embeddableService]);

  if (loading) {
    return <EuiSkeletonText />;
  }

  if (error || !LibraryComponent) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        iconColor="danger"
        body={
          <EuiText size="s" textAlign="center">
            <FormattedMessage
              id="dashboard.addToDashboardFlyout.libraryLoadError"
              defaultMessage="An error occurred loading the library"
            />
          </EuiText>
        }
        data-test-subj="dashboardLibraryLoadErrorIndicator"
      />
    );
  }

  return <LibraryComponent container={dashboardApi} />;
}

export function AddPanelFlyout({
  dashboardApi,
  closeFlyout,
  ariaLabelledBy,
  initialTab = TAB_NEW_ID,
}: {
  dashboardApi: DashboardApi;
  closeFlyout: () => void;
  ariaLabelledBy: string;
  initialTab?: FlyoutTab;
}) {
  const [selectedTab, setSelectedTab] = useState<FlyoutTab>(initialTab);

  const onTabClick = useCallback((tab: FlyoutTab) => {
    setSelectedTab(tab);
  }, []);

  return (
    <>
      <EuiFlyoutHeader hasBorder={false}>
        <EuiTitle size="s">
          <h1 id={ariaLabelledBy}>
            <FormattedMessage
              id="dashboard.solutionToolbar.addPanelFlyout.headingText"
              defaultMessage="Add to dashboard"
            />
          </h1>
        </EuiTitle>
        <EuiTabs bottomBorder={true}>
          <EuiTab
            isSelected={selectedTab === TAB_NEW_ID}
            onClick={() => onTabClick(TAB_NEW_ID)}
            data-test-subj="addToDashboardTab-new"
          >
            <FormattedMessage id="dashboard.addToDashboardFlyout.tabs.new" defaultMessage="New" />
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === TAB_LIBRARY_ID}
            onClick={() => onTabClick(TAB_LIBRARY_ID)}
            data-test-subj="addToDashboardTab-library"
          >
            <FormattedMessage
              id="dashboard.addToDashboardFlyout.tabs.fromLibrary"
              defaultMessage="From library"
            />
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {selectedTab === TAB_NEW_ID ? (
          <NewPanelContent dashboardApi={dashboardApi} />
        ) : (
          <LibraryContent dashboardApi={dashboardApi} />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} data-test-subj="dashboardPanelSelectionCloseBtn">
              <FormattedMessage
                id="dashboard.solutionToolbar.addPanelFlyout.cancelButtonText"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}
