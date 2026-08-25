/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPage, EuiPageBody, EuiPageHeader, EuiPageSection, EuiPageTemplate } from '@elastic/eui';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import type { ControlsExampleStartDeps } from '../plugin';
import { ControlGroupRendererExamples } from './control_group_renderer_examples';

const App = ({
  core,
  data,
  navigation,
  uiActions,
}: { core: CoreStart } & ControlsExampleStartDeps) => {
  return core.rendering.addContext(
    <KibanaContextProvider services={{ ...core, data, navigation, uiActions }}>
      <EuiPage>
        <EuiPageBody>
          <EuiPageSection>
            <EuiPageHeader pageTitle="Controls" />
          </EuiPageSection>
          <EuiPageTemplate.Section>
            <EuiPageSection>
              <ControlGroupRendererExamples data={data} navigation={navigation} />
            </EuiPageSection>
          </EuiPageTemplate.Section>
        </EuiPageBody>
      </EuiPage>
    </KibanaContextProvider>
  );
};

export const renderApp = (
  core: CoreStart,
  deps: ControlsExampleStartDeps,
  { element }: AppMountParameters
) => {
  ReactDOM.render(<App core={core} {...deps} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
