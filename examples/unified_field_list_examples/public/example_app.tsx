/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageSidebar,
  EuiTitle,
  EuiEmptyPrompt,
  EuiLoadingLogo,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { FieldListSidebar, FieldListSidebarProps } from './field_list_sidebar';

interface UnifiedFieldListExampleAppProps {
  services: FieldListSidebarProps['services'];
}

export const UnifiedFieldListExampleApp: React.FC<UnifiedFieldListExampleAppProps> = ({
  services,
}) => {
  const { navigation, data, unifiedSearch } = services;
  const { IndexPatternSelect } = unifiedSearch.ui;
  const [dataView, setDataView] = useState<DataView | null>();

  // Fetch the default data view using the `data.dataViews` service, as the component is mounted.
  useEffect(() => {
    const setDefaultDataView = async () => {
      const defaultDataView = await data.dataViews.getDefault();
      setDataView(defaultDataView);
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

  if (!dataView) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        color="warning"
        title={<h2>{PLUGIN_NAME}</h2>}
        body={<p>Make sure to create some data views first or install sample data.</p>}
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
              <EuiPageSidebar
                css={css`
                  flex: 1;
                  width: 320px;
                `}
              >
                <FieldListSidebar services={services} dataView={dataView} />
              </EuiPageSidebar>
            </RootDragDropProvider>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
};
