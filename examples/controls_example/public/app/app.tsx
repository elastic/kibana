/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
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

import { AppMountParameters } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { ControlsExampleStartDeps } from '../plugin';
import { BasicReduxExample } from './control_renderer_examples/basic_redux_example';
import { EditExample } from './control_renderer_examples/edit_example';
import { SearchExample } from './control_renderer_examples/search_example';
import { AddButtonExample } from './control_renderer_examples/add_button_example';
import { ControlRendererExamples } from './control_renderer_examples';

// export const renderApp = async (
// { data, navigation }: ControlsExampleStartDeps,
// { element }: AppMountParameters
// ) => {
// const dataViews = await data.dataViews.find('kibana_sample_data_logs');
// const examples =
//   dataViews.length > 0 ? (
//     <>
//       <SearchExample dataView={dataViews[0]} navigation={navigation} data={data} />
//       <EuiSpacer size="xl" />
//       <EditExample />
//       <EuiSpacer size="xl" />
//       <BasicReduxExample dataViewId={dataViews[0].id!} />
//       <EuiSpacer size="xl" />
//       <AddButtonExample dataViewId={dataViews[0].id!} />
//     </>
//   ) : (
//     <div>{'Install web logs sample data to run controls examples.'}</div>
//   );

//   ReactDOM.render(
//     <KibanaPageTemplate>
//       <KibanaPageTemplate.Header pageTitle="Controls as a Building Block" />
//       <KibanaPageTemplate.Section>{examples}</KibanaPageTemplate.Section>
//     </KibanaPageTemplate>,
//     element
//   );
//   return () => ReactDOM.unmountComponentAtNode(element);
// };

const CONTROLS_AS_A_BUILDING_BLOCK = 'controls_as_a_building_block';
const CONTROLS_REFACTOR_TEST = 'controls_refactor_test';

const App = ({ data, navigation }: ControlsExampleStartDeps) => {
  const [selectedTabId, setSelectedTabId] = useState(CONTROLS_AS_A_BUILDING_BLOCK);

  function onSelectedTabChanged(tabId: string) {
    setSelectedTabId(tabId);
  }

  function renderTabContent() {
    if (selectedTabId === CONTROLS_REFACTOR_TEST) {
      return <>test</>;
    }

    return <ControlRendererExamples data={data} navigation={navigation} />;
  }

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageSection>
          <EuiPageHeader pageTitle="Controls" />
        </EuiPageSection>
        <EuiPageTemplate.Section>
          <EuiPageSection>
            <EuiTabs>
              <EuiTab
                onClick={() => onSelectedTabChanged(CONTROLS_AS_A_BUILDING_BLOCK)}
                isSelected={CONTROLS_AS_A_BUILDING_BLOCK === selectedTabId}
              >
                Controls as a building block
              </EuiTab>
              <EuiTab
                onClick={() => onSelectedTabChanged(CONTROLS_REFACTOR_TEST)}
                isSelected={CONTROLS_REFACTOR_TEST === selectedTabId}
              >
                Register new embeddable type
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

export const renderApp = (
  { data, navigation }: ControlsExampleStartDeps,
  { element }: AppMountParameters
) => {
  ReactDOM.render(<App data={data} navigation={navigation} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
