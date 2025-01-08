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
  EuiTitle,
  EuiEmptyPrompt,
  EuiLoadingLogo,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { FieldListSidebar, FieldListSidebarProps } from './field_list_sidebar';
import { ExampleDropZone } from './example_drop_zone';

interface UnifiedFieldListExampleAppProps {
  services: FieldListSidebarProps['services'];
}

export const UnifiedFieldListExampleApp: React.FC<UnifiedFieldListExampleAppProps> = ({
  services,
}) => {
  const { navigation, data, unifiedSearch } = services;
  const { IndexPatternSelect } = unifiedSearch.ui;
  const [dataView, setDataView] = useState<DataView | null>();
  const [selectedFieldNames, setSelectedFieldNames] = useState<string[]>([]);

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

  const onDropFieldToWorkplace = useCallback(
    (fieldName: string) => {
      setSelectedFieldNames((names) => [...names.filter((name) => name !== fieldName), fieldName]);
    },
    [setSelectedFieldNames]
  );

  // Fetch the default data view using the `data.dataViews` service, as the component is mounted.
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

  return (
    <EuiPage grow={true}>
      <EuiPageBody paddingSize="s">
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h1>{PLUGIN_NAME}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <IndexPatternSelect
              placeholder={i18n.translate('searchSessionExample.selectDataViewPlaceholder', {
                defaultMessage: 'Select data view',
              })}
              indexPatternId={dataView?.id || ''}
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
          </EuiFlexItem>
          {dataView ? (
            <>
              <EuiFlexItem grow={false}>
                <navigation.ui.TopNavMenu
                  appName={PLUGIN_ID}
                  showSearchBar={true}
                  useDefaultBehaviors={true}
                  indexPatterns={dataView ? [dataView] : undefined}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <RootDragDropProvider>
                  <EuiFlexGroup direction="row" alignItems="stretch">
                    <EuiFlexItem grow={false}>
                      <FieldListSidebar
                        services={services}
                        dataView={dataView}
                        selectedFieldNames={selectedFieldNames}
                        onAddFieldToWorkspace={onAddFieldToWorkspace}
                        onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <ExampleDropZone onDropField={onDropFieldToWorkplace} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </RootDragDropProvider>
              </EuiFlexItem>
            </>
          ) : (
            <EuiEmptyPrompt
              iconType="warning"
              color="warning"
              title={<h2>Select a data view</h2>}
              body={<p>Make sure to have at least one data view or install sample data.</p>}
            />
          )}
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
};
