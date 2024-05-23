/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import {
  EuiPage,
  EuiPageBody,
  EuiPageTemplate,
  EuiPageSection,
  EuiSpacer,
  EuiPageHeader,
} from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { TriggerContextExample } from './trigger_context_example';
import { ContextMenuExamples } from './context_menu_examples';
import { Overview } from './overview';
import { HelloWorldExample } from './hello_world_example';

interface Props {
  uiActionsStartService: UiActionsStart;
  core: CoreStart;
}

const ActionsExplorer = ({ uiActionsStartService, core }: Props) => {
  return (
    <KibanaRenderContextProvider {...core}>
      <EuiPage>
        <EuiPageBody>
          <EuiPageSection>
            <EuiPageHeader pageTitle="Actions and Triggers" />
          </EuiPageSection>
          <EuiPageTemplate.Section>
            <EuiPageSection>
              <Overview />

              <EuiSpacer />

              <HelloWorldExample
                uiActionsStartService={uiActionsStartService}
                startServices={core}
              />

              <EuiSpacer />

              <TriggerContextExample uiActionsApi={uiActionsStartService} />

              <EuiSpacer />

              <ContextMenuExamples />
            </EuiPageSection>
          </EuiPageTemplate.Section>
        </EuiPageBody>
      </EuiPage>
    </KibanaRenderContextProvider>
  );
};

export const renderApp = (props: Props, { element }: AppMountParameters) => {
  ReactDOM.render(<ActionsExplorer {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
