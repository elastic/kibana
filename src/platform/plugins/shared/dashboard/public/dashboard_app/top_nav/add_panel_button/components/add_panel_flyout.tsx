/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
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
  EuiTitle,
  EuiFieldSearch,
  useEuiTheme,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DashboardApi } from '../../../../dashboard_api/types';
import { MenuItem, MenuItemGroup } from '../types';
import { getMenuItemGroups } from '../get_menu_item_groups';
import { Groups } from './groups';

export function AddPanelFlyout({ dashboardApi }: { dashboardApi: DashboardApi }) {
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

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h1 id="addPanelsFlyout">
            <FormattedMessage
              id="dashboard.solutionToolbar.addPanelFlyout.headingText"
              defaultMessage="Add panel"
            />
          </h1>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
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
                    compressed
                    autoFocus
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
                <Groups groups={filteredGroups} />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSkeletonText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={dashboardApi.clearOverlays}
              data-test-subj="dashboardPanelSelectionCloseBtn"
            >
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
