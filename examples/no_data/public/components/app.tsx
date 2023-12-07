/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import { EuiButton, EuiCode, EuiHorizontalRule, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { NoDataPagePluginSetup } from '@kbn/no-data-page-plugin/public';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { PLUGIN_NAME } from '../../common';

interface NoDataExamplesAppDeps {
  noDataPage: NoDataPagePluginSetup;
}

export const NoDataExamplesApp: React.FC<NoDataExamplesAppDeps> = ({ noDataPage }) => {
  // Use React hooks to manage state.
  const [showHasApiKeys, setShowHasApiKeys] = useState<boolean | null>(null);

  const onClickHandler = () => {
    setShowHasApiKeys(true);
  };

  const ShowHasApiKeys = () => {
    const hasApiKeysResponse = noDataPage.useHasApiKeys();
    if (hasApiKeysResponse == null) {
      return <>undetermined</>;
    }
    const { hasApiKeys, loading, error } = hasApiKeysResponse;

    if (error) {
      throw error;
    }

    if (loading) {
      return <EuiLoadingSpinner size="s" />;
    }

    return <>{hasApiKeys ? 'yes' : 'no'}</>;
  };

  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <KibanaErrorBoundaryProvider analytics={undefined}>
      <KibanaErrorBoundary>
        <KibanaPageTemplate>
          <KibanaPageTemplate.Header
            pageTitle={PLUGIN_NAME}
            data-test-subj="noDataPageExampleHeader"
          />
          <KibanaPageTemplate.Section grow={false}>
            <EuiText>
              <p>
                Service: <EuiCode>hasApiKeys</EuiCode>
                <br />
                <span data-test-subj="noDataPageExampleHasApiKeysResult">
                  Current user has API keys:{' '}
                  <strong>{showHasApiKeys ? <ShowHasApiKeys /> : 'unknown'}</strong>
                </span>
              </p>
              <p>Click to determine whether the user has created active API keys.</p>
              <EuiButton
                type="primary"
                size="s"
                onClick={onClickHandler}
                data-test-subj="noDataPageExampleHasApiKeysClick"
              >
                Click
              </EuiButton>
            </EuiText>
          </KibanaPageTemplate.Section>
          <KibanaPageTemplate.Section>
            <EuiHorizontalRule />
            <EuiText>
              <p>
                Service: <EuiCode>getAnalyticsNoDataPageFlavor</EuiCode>
                <br />
                Analytics NoDataPage Flavor:{' '}
                <strong data-test-subj="noDataPageExampleNoDataPageFlavorResult">
                  {noDataPage.getAnalyticsNoDataPageFlavor() ?? 'undefined'}
                </strong>
              </p>
            </EuiText>
          </KibanaPageTemplate.Section>
        </KibanaPageTemplate>
      </KibanaErrorBoundary>
    </KibanaErrorBoundaryProvider>
  );
};
