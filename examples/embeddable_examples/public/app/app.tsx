/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import { AppMountParameters } from '@kbn/core-application-browser';
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiPageTemplate,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { Overview } from './overview';
import { RegisterEmbeddable } from './register_embeddable';
import { RenderExamples } from './render_examples';

const OVERVIEW_TAB_ID = 'overview';
const REGISTER_EMBEDDABLE_TAB_ID = 'register';
const RENDER_TAB_ID = 'render';

const App = () => {
  const [selectedTabId, setSelectedTabId] = useState(OVERVIEW_TAB_ID);

  function onSelectedTabChanged(tabId: string) {
    setSelectedTabId(tabId);
  }

  function renderTabContent() {
    if (selectedTabId === RENDER_TAB_ID) {
      return <RenderExamples />;
    }

    if (selectedTabId === REGISTER_EMBEDDABLE_TAB_ID) {
      return <RegisterEmbeddable />;
    }

    return <Overview />;
  }

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageSection>
          <EuiPageHeader pageTitle="Embeddables" />
        </EuiPageSection>
        <EuiPageTemplate.Section>
          <EuiPageSection>
            <EuiTabs>
              <EuiTab
                onClick={() => onSelectedTabChanged(OVERVIEW_TAB_ID)}
                isSelected={OVERVIEW_TAB_ID === selectedTabId}
              >
                Embeddables overview
              </EuiTab>
              <EuiTab
                onClick={() => onSelectedTabChanged(REGISTER_EMBEDDABLE_TAB_ID)}
                isSelected={REGISTER_EMBEDDABLE_TAB_ID === selectedTabId}
              >
                Register new embeddable type
              </EuiTab>
              <EuiTab
                onClick={() => onSelectedTabChanged(RENDER_TAB_ID)}
                isSelected={RENDER_TAB_ID === selectedTabId}
              >
                Rendering embeddables in your application
              </EuiTab>
            </EuiTabs>

            <EuiSpacer />

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
