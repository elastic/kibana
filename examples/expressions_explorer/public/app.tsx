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
  EuiPageHeader,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { AppMountParameters, IUiSettingsClient } from '@kbn/core/public';
import { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { RunExpressionsExample } from './run_expressions';
import { RenderExpressionsExample } from './render_expressions';
import { ActionsExpressionsExample } from './actions_and_expressions';
import { ActionsExpressionsExample2 } from './actions_and_expressions2';

interface Props {
  expressions: ExpressionsStart;
  inspector: InspectorStart;
  actions: UiActionsStart;
  uiSettings: IUiSettingsClient;
}

const ExpressionsExplorer = ({ expressions, inspector, actions, uiSettings }: Props) => {
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({ uiSettings });
  return (
    <KibanaReactContextProvider>
      <EuiPage>
        <EuiPageBody>
          <EuiPageHeader>Expressions Explorer</EuiPageHeader>
          <EuiPageContent>
            <EuiPageContentBody>
              <EuiText>
                <p>
                  There are a couple of ways to run the expressions. Below some of the options are
                  demonstrated. You can read more about it{' '}
                  <EuiLink
                    href={
                      'https://github.com/elastic/kibana/blob/main/src/plugins/expressions/README.asciidoc'
                    }
                  >
                    here
                  </EuiLink>
                </p>
              </EuiText>

              <EuiSpacer />

              <RunExpressionsExample expressions={expressions} inspector={inspector} />

              <EuiSpacer />

              <RenderExpressionsExample expressions={expressions} inspector={inspector} />

              <EuiSpacer />

              <ActionsExpressionsExample expressions={expressions} actions={actions} />

              <EuiSpacer />

              <ActionsExpressionsExample2 expressions={expressions} actions={actions} />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </KibanaReactContextProvider>
  );
};

export const renderApp = (props: Props, { element }: AppMountParameters) => {
  ReactDOM.render(<ExpressionsExplorer {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
