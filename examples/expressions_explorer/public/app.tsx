/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {
  EuiPage,
  EuiPageHeader,
  EuiPageBody,
  EuiPageTemplate,
  EuiPageSection,
  EuiSpacer,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import type {
  AppMountParameters,
  I18nStart,
  IUiSettingsClient,
  ThemeServiceStart,
  UserProfileService,
} from '@kbn/core/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { RunExpressionsExample } from './run_expressions';
import { RenderExpressionsExample } from './render_expressions';

interface Props {
  expressions: ExpressionsStart;
  inspector: InspectorStart;
  actions: UiActionsStart;
  uiSettings: IUiSettingsClient;
  userProfile: UserProfileService;
  settings: SettingsStart;
  theme: ThemeServiceStart;
  i18n: I18nStart;
}

const ExpressionsExplorer = ({
  expressions,
  inspector,
  actions,
  uiSettings,
  settings,
  ...startServices
}: Props) => {
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings,
    settings,
    theme: startServices.theme,
  });
  return (
    <KibanaRenderContextProvider {...startServices}>
      <KibanaReactContextProvider>
        <EuiPage>
          <EuiPageBody>
            <EuiPageSection>
              <EuiPageHeader pageTitle="Expressions Explorer" />
            </EuiPageSection>
            <EuiPageTemplate.Section>
              <EuiPageSection>
                <EuiText>
                  <p>
                    There are a couple of ways to run the expressions. Below some of the options are
                    demonstrated. You can read more about it{' '}
                    <EuiLink
                      href={
                        'https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/expressions/README.asciidoc'
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
              </EuiPageSection>
            </EuiPageTemplate.Section>
          </EuiPageBody>
        </EuiPage>
      </KibanaReactContextProvider>
    </KibanaRenderContextProvider>
  );
};

export const renderApp = (props: Props, { element }: AppMountParameters) => {
  ReactDOM.render(<ExpressionsExplorer {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
