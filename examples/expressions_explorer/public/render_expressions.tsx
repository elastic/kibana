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
  EuiButton,
} from '@elastic/eui';
import {
  ExpressionsStart,
  ReactExpressionRenderer,
  ExpressionsInspectorAdapter,
} from '../../../src/plugins/expressions/public';
import { ExpressionEditor } from './editor/expression_editor';
import { Start as InspectorStart } from '../../../src/plugins/inspector/public';

interface Props {
  expressions: ExpressionsStart;
  inspector: InspectorStart;
}

export function RenderExpressionsExample({ expressions, inspector }: Props) {
  const [expression, updateExpression] = useState('markdown "## expressions explorer rendering"');

  const expressionChanged = (value: string) => {
    updateExpression(value);
  };

  const inspectorAdapters = {
    expression: new ExpressionsInspectorAdapter(),
  };

  return (
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Render expressions</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText>
                In the below editor you can enter your expression and render it. Using
                ReactExpressionRenderer component makes that very easy.
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                onClick={() => {
                  inspector.open(inspectorAdapters);
                }}
              >
                Open Inspector
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiPanel data-test-subj="expressionEditor" paddingSize="none" role="figure">
                <ExpressionEditor value={expression} onChange={expressionChanged} />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel data-test-subj="expressionRender" paddingSize="none" role="figure">
                <ReactExpressionRenderer
                  expression={expression}
                  debug={true}
                  inspectorAdapters={inspectorAdapters}
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
