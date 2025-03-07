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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiEmptyPrompt,
  EuiLoadingLogo,
  useEuiTheme,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { AppMountParameters } from '@kbn/core-application-browser';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { DataViewPickerProps } from '@kbn/unified-search-plugin/public';
import { type TabItem, UnifiedTabs, useNewTabProps } from '@kbn/unified-tabs';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { FieldListSidebar, FieldListSidebarProps } from './field_list_sidebar';

interface UnifiedTabsExampleAppProps {
  services: FieldListSidebarProps['services'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

export const UnifiedTabsExampleApp: React.FC<UnifiedTabsExampleAppProps> = ({
  services,
  setHeaderActionMenu,
}) => {
  const { euiTheme } = useEuiTheme();
  const { navigation, data, unifiedSearch } = services;
  const { IndexPatternSelect } = unifiedSearch.ui;
  const [dataView, setDataView] = useState<DataView | null>();
  const [selectedFieldNames, setSelectedFieldNames] = useState<string[]>([]);
  const { getNewTabDefaultProps } = useNewTabProps({ numberOfInitialItems: 0 });
  const [initialItems] = useState<TabItem[]>(() =>
    Array.from({ length: 10 }, () => getNewTabDefaultProps())
  );

  const onAddFieldToWorkspace = useCallback(
    (field: DataViewField) => {
      setSelectedFieldNames((names) => [...names, field.name]);
    },
    [setSelectedFieldNames]
  );

  const onRemoveFieldFromWorkspace = useCallback(
    (field: DataViewField) => {
      setSelectedFieldNames((names) => names.filter((name) => name !== field.name));
    },
    [setSelectedFieldNames]
  );

  useEffect(() => {
    const setDefaultDataView = async () => {
      try {
        const defaultDataView = await data.dataViews.getDefault();
        setDataView(defaultDataView);
      } catch (e) {
        setDataView(null);
      }
    };

    setDefaultDataView();
  }, [data]);

  if (typeof dataView === 'undefined') {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
        title={<h2>{PLUGIN_NAME}</h2>}
        body={<p>Loading...</p>}
      />
    );
  }

  const SearchBar = navigation.ui.AggregateQueryTopNavMenu;

  return (
    <EuiPage
      grow={true}
      css={css`
        background-color: ${euiTheme.colors.backgroundBasePlain};
      `}
    >
      <EuiPageBody paddingSize="none">
        {dataView ? (
          <div className="eui-fullHeight">
            <UnifiedTabs
              initialItems={initialItems}
              maxItemsCount={20}
              onChanged={() => {}}
              createItem={getNewTabDefaultProps}
              renderContent={({ label }) => {
                return (
                  <EuiFlexGroup direction="column" gutterSize="none">
                    <EuiFlexItem grow={false}>
                      <SearchBar
                        appName={PLUGIN_ID}
                        indexPatterns={[dataView]}
                        onQuerySubmit={() => {}}
                        isLoading={false}
                        showDatePicker
                        allowSavingQueries
                        showSearchBar
                        dataViewPickerComponentProps={
                          {
                            trigger: {
                              label: dataView?.getName() || '',
                              'data-test-subj': 'discover-dataView-switch-link',
                              title: dataView?.getIndexPattern() || '',
                            },
                            currentDataViewId: dataView?.id,
                          } as DataViewPickerProps
                        }
                        useDefaultBehaviors
                        displayStyle="detached"
                        config={[
                          {
                            id: 'inspect',
                            label: 'Inspect',
                            run: () => {},
                          },
                          {
                            id: 'alerts',
                            label: 'Alerts',
                            run: () => {},
                          },
                          {
                            id: 'open',
                            label: 'Open',
                            iconType: 'folderOpen',
                            iconOnly: true,
                            run: () => {},
                          },
                          {
                            id: 'share',
                            label: 'Share',
                            iconType: 'share',
                            iconOnly: true,
                            run: () => {},
                          },
                          {
                            id: 'save',
                            label: 'Save',
                            emphasize: true,
                            run: () => {},
                          },
                        ]}
                        setMenuMountPoint={setHeaderActionMenu}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <EuiFlexGroup direction="row" alignItems="stretch">
                        <EuiFlexItem
                          grow={false}
                          css={css`
                            background-color: ${euiTheme.colors.body};
                            border-right: ${euiTheme.border.thin};
                          `}
                        >
                          <FieldListSidebar
                            services={services}
                            dataView={dataView}
                            selectedFieldNames={selectedFieldNames}
                            onAddFieldToWorkspace={onAddFieldToWorkspace}
                            onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiPanel hasShadow={false} paddingSize="l" className="eui-fullHeight">
                            <EuiEmptyPrompt
                              iconType="beaker"
                              title={<h3>{PLUGIN_NAME}</h3>}
                              body={<p>Tab: {label}</p>}
                            />
                          </EuiPanel>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                );
              }}
            />
          </div>
        ) : (
          <EuiEmptyPrompt
            iconType="warning"
            color="warning"
            title={<h2>Make sure to have at least one data view</h2>}
            body={
              <p>
                <IndexPatternSelect
                  placeholder={i18n.translate('searchSessionExample.selectDataViewPlaceholder', {
                    defaultMessage: 'Select data view',
                  })}
                  indexPatternId=""
                  onChange={async (dataViewId?: string) => {
                    if (dataViewId) {
                      const newDataView = await data.dataViews.get(dataViewId);
                      setDataView(newDataView);
                    } else {
                      setDataView(undefined);
                    }
                  }}
                  isClearable={false}
                  data-test-subj="dataViewSelector"
                />
              </p>
            }
          />
        )}
      </EuiPageBody>
    </EuiPage>
  );
};
