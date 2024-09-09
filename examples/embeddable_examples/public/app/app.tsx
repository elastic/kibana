/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
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
import { PresentationContainerExample } from './presentation_container_example/components/presentation_container_example';
import { StartDeps } from '../plugin';

const OVERVIEW_TAB_ID = 'overview';
const REGISTER_EMBEDDABLE_TAB_ID = 'register';
const RENDER_TAB_ID = 'render';
const PRESENTATION_CONTAINER_EXAMPLE_ID = 'presentationContainerExample';

const App = ({ core, deps }: { core: CoreStart; deps: StartDeps }) => {
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

    if (selectedTabId === PRESENTATION_CONTAINER_EXAMPLE_ID) {
      return <PresentationContainerExample uiActions={deps.uiActions} />;
    }

    return <Overview />;
  }

  return (
    <KibanaRenderContextProvider i18n={core.i18n} theme={core.theme}>
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
                <EuiTab
                  onClick={() => onSelectedTabChanged(PRESENTATION_CONTAINER_EXAMPLE_ID)}
                  isSelected={PRESENTATION_CONTAINER_EXAMPLE_ID === selectedTabId}
                >
                  PresentationContainer example
                </EuiTab>
              </EuiTabs>

              <EuiSpacer />

              {renderTabContent()}
            </EuiPageSection>
          </EuiPageTemplate.Section>
        </EuiPageBody>
      </EuiPage>
    </KibanaRenderContextProvider>
  );
};

export const renderApp = (
  core: CoreStart,
  deps: StartDeps,
  element: AppMountParameters['element']
) => {
  ReactDOM.render(<App core={core} deps={deps} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
