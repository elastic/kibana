/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { ControlsExampleStartDeps } from '../plugin';
import { ControlGroupRendererExamples } from './control_group_renderer_examples';
import { ReactControlExample } from './react_control_example';

const CONTROLS_AS_A_BUILDING_BLOCK = 'controls_as_a_building_block';
const CONTROLS_REFACTOR_TEST = 'controls_refactor_test';

const App = ({
  core,
  data,
  navigation,
}: { core: CoreStart } & Pick<ControlsExampleStartDeps, 'data' | 'navigation'>) => {
  const [selectedTabId, setSelectedTabId] = useState(CONTROLS_REFACTOR_TEST); // TODO: Make this the first tab

  function onSelectedTabChanged(tabId: string) {
    setSelectedTabId(tabId);
  }

  function renderTabContent() {
    if (selectedTabId === CONTROLS_REFACTOR_TEST) {
      return <ReactControlExample dataViews={data.dataViews} core={core} />;
    }

    return <ControlGroupRendererExamples data={data} navigation={navigation} />;
  }

  return (
    <KibanaRenderContextProvider i18n={core.i18n} theme={core.theme}>
      <EuiPage>
        <EuiPageBody>
          <EuiPageSection>
            <EuiPageHeader pageTitle="Controls" />
          </EuiPageSection>
          <EuiPageTemplate.Section>
            <EuiPageSection>
              <EuiTabs>
                <EuiTab
                  onClick={() => onSelectedTabChanged(CONTROLS_REFACTOR_TEST)}
                  isSelected={CONTROLS_REFACTOR_TEST === selectedTabId}
                >
                  Register a new React control
                </EuiTab>
                <EuiTab
                  onClick={() => onSelectedTabChanged(CONTROLS_AS_A_BUILDING_BLOCK)}
                  isSelected={CONTROLS_AS_A_BUILDING_BLOCK === selectedTabId}
                >
                  Controls as a building block
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
  { data, navigation }: Pick<ControlsExampleStartDeps, 'data' | 'navigation'>,
  { element }: AppMountParameters
) => {
  ReactDOM.render(<App core={core} data={data} navigation={navigation} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
