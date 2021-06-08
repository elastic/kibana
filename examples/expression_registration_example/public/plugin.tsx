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
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiText,
} from '@elastic/eui';
import { Plugin, CoreSetup, AppMountParameters, AppNavLinkStatus } from '../../../src/core/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';
import {
  ExpressionsSetup,
  ExpressionsStart,
  ReactExpressionRenderer,
} from '../../../src/plugins/expressions/public';

import { demoFunction } from './expression_functions/demo_function';
import { DemoRenderer } from './demo_renderer';

interface StartDeps {
  expression: ExpressionsStart;
}

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  expressions: ExpressionsSetup;
}

export class VisTypeDemoPlugin implements Plugin<void, void, {}, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { expressions, developerExamples }: SetupDeps) {
    // Register functions and rendere with Expressions Plugin
    expressions.registerFunction(demoFunction);
    expressions.registerRenderer(DemoRenderer);

    // The following code is just to add the plugin to developer examples and is no necessary for a plugin just adding to expressions
    core.application.register({
      id: 'visTypeDemo',
      title: 'Vis Type Demo',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const renderApp = (element: AppMountParameters['element']) => {
          const myExpression = `demofunction inputText="inputText" inputColor="red"`;
          ReactDOM.render(
            <EuiPage>
              <EuiPageBody>
                <EuiPageHeader>Vis Type Demo Plugin</EuiPageHeader>
                <EuiPageContent>
                  <EuiPageContentBody>
                    <EuiText>
                      This is a rendering of the the expression
                      <pre>
                        <code>{myExpression}</code>
                      </pre>
                    </EuiText>

                    <br />
                    <ReactExpressionRenderer expression={myExpression} />
                  </EuiPageContentBody>
                </EuiPageContent>
              </EuiPageBody>
            </EuiPage>,
            element
          );

          return () => ReactDOM.unmountComponentAtNode(element);
        };

        return renderApp(params.element);
      },
    });

    developerExamples.register({
      appId: 'visTypeDemo',
      title: 'Vis Type Demo',
      description: `An example of registering functions and renderers to the expressions plugin`,
      links: [],
    });
  }

  public start() {}
  public stop() {}
}
