/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  ExpressionsStart,
  ReactExpressionRenderer,
  ExpressionsInspectorAdapter,
} from '../../../src/plugins/expressions/public';
import { ExpressionEditor } from './editor/expression_editor';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { NAVIGATE_TRIGGER_ID } from './actions/navigate_trigger';

interface Props {
  expressions: ExpressionsStart;
  actions: UiActionsStart;
}

export function ActionsExpressionsExample({ expressions, actions }: Props) {
  const [expression, updateExpression] = useState(
    'button name="click me" href="http://www.google.com"'
  );

  const expressionChanged = (value: string) => {
    updateExpression(value);
  };

  const inspectorAdapters = {
    expression: new ExpressionsInspectorAdapter(),
  };

  const handleEvents = (event: any) => {
    if (event.id !== 'NAVIGATE') return;
    // enrich event context with some extra data
    event.baseUrl = 'http://www.google.com';

    actions.executeTriggerActions(NAVIGATE_TRIGGER_ID, event.value);
  };

  return (
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Actions from expression renderers</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText>
                Here you can play with sample `button` which takes a url as configuration and
                displays a button which emits custom BUTTON_CLICK trigger to which we have attached
                a custom action which performs the navigation.
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiPanel data-test-subj="expressionEditor" paddingSize="none" role="figure">
                <ExpressionEditor value={expression} onChange={expressionChanged} />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel
                data-test-subj="helloWorldEmbeddableFromFactory"
                paddingSize="none"
                role="figure"
              >
                <ReactExpressionRenderer
                  expression={expression}
                  debug={true}
                  inspectorAdapters={inspectorAdapters}
                  onEvent={handleEvents}
                  renderError={(message: any) => {
                    return <div>{message}</div>;
                  }}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
}
