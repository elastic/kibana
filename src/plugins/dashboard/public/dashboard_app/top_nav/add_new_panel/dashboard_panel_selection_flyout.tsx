/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { i18n as i18nFn } from '@kbn/i18n';
import { type EuiFlyoutProps, EuiLoadingChart } from '@elastic/eui';
import orderBy from 'lodash/orderBy';
import {
  EuiEmptyPrompt,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiBadge,
  EuiFormRow,
  EuiTitle,
  EuiFieldSearch,
  useEuiTheme,
  EuiListGroup,
  EuiListGroupItem,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  type PanelSelectionMenuItem,
  type GroupedAddPanelActions,
} from './add_panel_action_menu_items';

export interface DashboardPanelSelectionListFlyoutProps {
  /** Handler to close flyout */
  close: () => void;
  /** Padding for flyout  */
  paddingSize: Exclude<EuiFlyoutProps['paddingSize'], 'none' | undefined>;
  /** Fetches the panels available for a dashboard  */
  fetchDashboardPanels: () => Promise<GroupedAddPanelActions[]>;
}

export const DashboardPanelSelectionListFlyout: React.FC<
  DashboardPanelSelectionListFlyoutProps
> = ({ close, paddingSize, fetchDashboardPanels }) => {
  const { euiTheme } = useEuiTheme();
  const [{ data: panels, loading, error }, setPanelState] = useState<{
    loading: boolean;
    data: GroupedAddPanelActions[] | null;
    error: unknown | null;
  }>({ loading: true, data: null, error: null });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [panelsSearchResult, setPanelsSearchResult] = useState<GroupedAddPanelActions[] | null>(
    panels
  );

  useEffect(() => {
    const requestDashboardPanels = () => {
      fetchDashboardPanels()
        .then((_panels) =>
          setPanelState((prevState) => ({
            ...prevState,
            loading: false,
            data: _panels,
          }))
        )
        .catch((err) =>
          setPanelState((prevState) => ({
            ...prevState,
            loading: false,
            error: err,
          }))
        );
    };

    requestDashboardPanels();
  }, [fetchDashboardPanels]);

  useEffect(() => {
    const _panels = (panels ?? []).slice(0);

    if (!searchTerm) {
      return setPanelsSearchResult(_panels);
    }

    const q = searchTerm.toLowerCase();

    setPanelsSearchResult(
      orderBy(
        _panels.map((panel) => {
          const groupSearchMatch = panel.title.toLowerCase().includes(q);

          const [groupSearchMatchAgg, items] = panel.items.reduce(
            (acc, cur) => {
              const searchMatch = cur.name.toLowerCase().includes(q);

              acc[0] = acc[0] || searchMatch;
              acc[1].push({
                ...cur,
                isDisabled: !(groupSearchMatch || searchMatch),
              });

              return acc;
            },
            [groupSearchMatch, [] as PanelSelectionMenuItem[]]
          );

          return {
            ...panel,
            isDisabled: !groupSearchMatchAgg,
            items,
          };
        }),
        ['isDisabled']
      )
    );
  }, [panels, searchTerm]);

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
        <EuiFlexGroup direction="column" responsive={false} gutterSize="m">
          <EuiFlexItem
            grow={false}
            css={{
              position: 'sticky',
              top: euiTheme.size[paddingSize],
              zIndex: 1,
              boxShadow: `0 -${euiTheme.size[paddingSize]} 0 4px ${euiTheme.colors.emptyShade}`,
            }}
          >
            <EuiForm component="form" fullWidth>
              <EuiFormRow css={{ backgroundColor: euiTheme.colors.emptyShade }}>
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
                  className="nsPanelSelectionFlyout__searchInput"
                  data-test-subj="dashboardPanelSelectionFlyout__searchInput"
                />
              </EuiFormRow>
            </EuiForm>
          </EuiFlexItem>
          <EuiFlexItem
            css={{
              minHeight: '20vh',
              ...(loading || error
                ? {
                    justifyContent: 'center',
                    alignItems: 'center',
                  }
                : {}),
            }}
          >
            {loading ? (
              <EuiEmptyPrompt
                data-test-subj="dashboardPanelSelectionLoadingIndicator"
                icon={<EuiLoadingChart size="l" mono />}
              />
            ) : (
              <EuiFlexGroup
                direction="column"
                gutterSize="m"
                data-test-subj="dashboardPanelSelectionList"
              >
                {panelsSearchResult?.some(({ isDisabled }) => !isDisabled) ? (
                  panelsSearchResult.map(
                    ({ id, title, items, isDisabled, ['data-test-subj']: dataTestSubj, order }) =>
                      !isDisabled ? (
                        <EuiFlexItem
                          key={id}
                          data-test-subj={dataTestSubj}
                          data-group-sort-order={order}
                        >
                          <EuiTitle id={`${id}-group`} size="xxs">
                            {typeof title === 'string' ? <h3>{title}</h3> : title}
                          </EuiTitle>
                          <EuiListGroup
                            aria-labelledby={`${id}-group`}
                            size="s"
                            gutterSize="none"
                            maxWidth={false}
                            flush
                          >
                            {items?.map((item, idx) => {
                              return (
                                <EuiListGroupItem
                                  key={`${id}.${idx}`}
                                  label={
                                    <EuiToolTip position="right" content={item.description}>
                                      {!item.isDeprecated ? (
                                        <EuiText size="s">{item.name}</EuiText>
                                      ) : (
                                        <EuiFlexGroup wrap responsive={false} gutterSize="s">
                                          <EuiFlexItem grow={false}>
                                            <EuiText size="s">{item.name}</EuiText>
                                          </EuiFlexItem>
                                          <EuiFlexItem grow={false}>
                                            <EuiBadge color="warning">
                                              <FormattedMessage
                                                id="dashboard.editorMenu.deprecatedTag"
                                                defaultMessage="Deprecated"
                                              />
                                            </EuiBadge>
                                          </EuiFlexItem>
                                        </EuiFlexGroup>
                                      )}
                                    </EuiToolTip>
                                  }
                                  onClick={item?.onClick}
                                  iconType={item.icon}
                                  data-test-subj={item['data-test-subj']}
                                  isDisabled={item.isDisabled}
                                />
                              );
                            })}
                          </EuiListGroup>
                        </EuiFlexItem>
                      ) : null
                  )
                ) : (
                  <>
                    {Boolean(error) ? (
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
                      <EuiText
                        size="s"
                        textAlign="center"
                        data-test-subj="dashboardPanelSelectionNoPanelMessage"
                      >
                        <FormattedMessage
                          id="dashboard.solutionToolbar.addPanelFlyout.noResultsDescription"
                          defaultMessage="No panel types found"
                        />
                      </EuiText>
                    )}
                  </>
                )}
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={close} data-test-subj="dashboardPanelSelectionCloseBtn">
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
};
