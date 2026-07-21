/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSkeletonText,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n, i18n as i18nFn } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AiButton } from '@kbn/shared-ux-ai-components';
import useAsync from 'react-use/lib/useAsync';

import type { DashboardApi } from '../../../../dashboard_api/types';
import { embeddableService, uiActionsService } from '../../../../services/kibana_services';
import { onAddPanelClick, useMenuItemGroups } from '../use_menu_item_groups';
import { useFeaturedItems } from '../use_featured_items';
import type { MenuItem, MenuItemGroup } from '../types';
import { Groups } from './groups';
import { FeaturedItemCard } from './featured_item_card';
import { OPEN_DASHBOARD_CHAT_ACTION_ID } from '../../../../dashboard_renderer/viewport/empty_screen/dashboard_empty_screen_chat_action';
import { openDashboardChat } from '../../../../dashboard_renderer/viewport/empty_screen/dashboard_empty_screen_chat';

const TAB_NEW_ID = 'new' as const;
const TAB_LIBRARY_ID = 'library' as const;
type FlyoutTab = typeof TAB_NEW_ID | typeof TAB_LIBRARY_ID;

function NewPanelContent({ dashboardApi }: { dashboardApi: DashboardApi }) {
  const {
    groups,
    loading: isLoadingGroups,
    error: loadGroupsError,
  } = useMenuItemGroups({ dashboardApi });
  const { featuredItems, loading: isLoadingFeaturedItems } = useFeaturedItems({ dashboardApi });

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

  return (
    <EuiSkeletonText isLoading={isLoadingGroups || isLoadingFeaturedItems}>
      <EuiFlexGroup
        data-test-subj="dashboardPanelSelectionFlyout"
        direction="column"
        responsive={false}
        gutterSize="m"
      >
        <EuiFlexItem grow={false} css={styles.stickySearchBar}>
          <EuiForm component="form" fullWidth>
            <EuiFormRow>
              <EuiFieldSearch
                autoFocus
                compressed
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                aria-label={i18nFn.translate(
                  'dashboard.editorMenu.addPanelFlyout.searchLabelText',
                  { defaultMessage: 'Search field for panels' }
                )}
                data-test-subj="dashboardPanelSelectionFlyout__searchInput"
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
        {featuredItems.length > 0 && (
          <EuiFlexItem grow={false} css={styles.featuredPanelsWrapper}>
            { uiActionsService.hasAction(OPEN_DASHBOARD_CHAT_ACTION_ID) &&
              <AiButton
                key={OPEN_DASHBOARD_CHAT_ACTION_ID}
                fullWidth
                size="m"
                variant="base"
                iconType="productAgent"
                onClick={(event: React.MouseEvent) => {
                  onAddPanelClick(event, dashboardApi, openDashboardChat);
                }}
                data-test-subj="create-action-Create with chat"
              >
                {i18n.translate('dashboard.addPanelFlyout.createWithChatButtonLabel', {
                  defaultMessage: 'Create with chat',
                })}
              </AiButton>
            }
            {featuredItems.map((item) => 
              !item.isDisabled && <FeaturedItemCard key={item.id} item={item} />
            )}
          </EuiFlexItem>
        )}
        <EuiFlexItem css={styles.flyoutContentWrapper}>
          {loadGroupsError ? (
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
            <Groups groups={filteredGroups} />
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
  ariaLabelledBy,
  initialTab = TAB_NEW_ID,
}: {
  dashboardApi: DashboardApi;
  ariaLabelledBy: string;
  initialTab?: FlyoutTab;
}) {
  const [selectedTab, setSelectedTab] = useState<FlyoutTab>(initialTab);

  const onTabClick = useCallback((tab: FlyoutTab) => {
    setSelectedTab(tab);
  }, []);

  return (
    <>
      <EuiFlyoutHeader hasBorder={false} data-test-subj="addToDashboardFlyout-header">
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
    </>
  );
}

const styles = {
  stickySearchBar: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'sticky',
      top: euiTheme.size.m,
      zIndex: euiTheme.levels.header,
      boxShadow: `0 -${euiTheme.size.m} 0 4px ${euiTheme.colors.backgroundBasePlain}`,
    }),
  featuredPanelsWrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      gap: euiTheme.size.s,
    }),
  flyoutContentWrapper: css({
    minHeight: '20vh',
  }),
};
