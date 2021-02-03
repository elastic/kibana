/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
import { AppMountParameters } from '../../../src/core/public';
import { ExpressionsStart } from '../../../src/plugins/expressions/public';
import { Start as InspectorStart } from '../../../src/plugins/inspector/public';
import { RunExpressionsExample } from './run_expressions';
import { RenderExpressionsExample } from './render_expressions';
import { ActionsExpressionsExample } from './actions_and_expressions';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';

interface Props {
  expressions: ExpressionsStart;
  inspector: InspectorStart;
  actions: UiActionsStart;
}

const ExpressionsExplorer = ({ expressions, inspector, actions }: Props) => {
  return (
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
                    'https://github.com/elastic/kibana/blob/master/src/plugins/expressions/README.asciidoc'
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
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export const renderApp = (props: Props, { element }: AppMountParameters) => {
  ReactDOM.render(<ExpressionsExplorer {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
