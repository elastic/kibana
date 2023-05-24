/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageSidebar,
  EuiTitle,
  EuiEmptyPrompt,
  EuiLoadingLogo,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

interface UnifiedFieldListExampleAppProps {
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export const UnifiedFieldListExampleApp: React.FC<UnifiedFieldListExampleAppProps> = ({
  navigation,
  data,
  unifiedSearch,
}) => {
  const { IndexPatternSelect } = unifiedSearch.ui;
  const [dataView, setDataView] = useState<DataView | null>();
  const [_ /* fields */, setFields] = useState<DataViewField[]>();

  // Fetch the default data view using the `data.dataViews` service, as the component is mounted.
  useEffect(() => {
    const setDefaultDataView = async () => {
      const defaultDataView = await data.dataViews.getDefault();
      setDataView(defaultDataView);
    };

    setDefaultDataView();
  }, [data]);

  // Update the fields list every time the data view is modified.
  useEffect(() => {
    setFields(dataView?.fields);
  }, [dataView]);

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
    <EuiPage>
      <EuiPageBody>
        <EuiPageSection>
          <EuiTitle>
            <h1>{PLUGIN_NAME}</h1>
          </EuiTitle>
          <EuiFlexGrid columns={4}>
            <EuiFlexItem>
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
          </EuiFlexGrid>
          <navigation.ui.TopNavMenu
            appName={PLUGIN_ID}
            showSearchBar={true}
            useDefaultBehaviors={true}
            indexPatterns={dataView ? [dataView] : undefined}
          />
          <EuiFlexGrid columns={4}>
            <EuiFlexItem grow={false}>
              <EuiPageSidebar>
                <div style={{ background: 'blue' }}>test</div>
              </EuiPageSidebar>
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
