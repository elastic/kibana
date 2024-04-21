/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import { AppMountParameters } from "@kbn/core-application-browser";
import { EuiPage, EuiPageBody, EuiPageHeader, EuiPageSection, EuiPageTemplate, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { Overview } from './overview';

const OVERVIEW_TAB_ID = 'overview';
const RENDER_TAB_ID = 'render';

const App = () => {
  const [selectedTabId, setSelectedTabId] = useState(OVERVIEW_TAB_ID);

  function onSelectedTabChanged(tabId: string) {
    setSelectedTabId(tabId);
  }

  function renderTabContent() {
    return <Overview/>
  }
  
  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageSection>
          <EuiPageHeader pageTitle="Embeddables" />
          <EuiTabs>
            <EuiTab
              onClick={() => onSelectedTabChanged(OVERVIEW_TAB_ID)}
              isSelected={OVERVIEW_TAB_ID === selectedTabId}
            >
              Overview
            </EuiTab>
            <EuiTab
              onClick={() => onSelectedTabChanged(RENDER_TAB_ID)}
              isSelected={RENDER_TAB_ID === selectedTabId}
            >
              Render
            </EuiTab>
          </EuiTabs>
        </EuiPageSection>
        <EuiPageTemplate.Section>
          <EuiPageSection>
            {renderTabContent()}
          </EuiPageSection>
        </EuiPageTemplate.Section>
      </EuiPageBody>
    </EuiPage>
  );
};

export const renderApp = (element: AppMountParameters['element']) => {
  ReactDOM.render(<App />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};