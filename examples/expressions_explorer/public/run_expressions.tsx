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

import React, { useState, useEffect, useMemo } from 'react';
import {
  EuiCodeBlock,
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
  ExpressionsInspectorAdapter,
} from '../../../src/plugins/expressions/public';
import { ExpressionEditor } from './editor/expression_editor';
import { Start as InspectorStart } from '../../../src/plugins/inspector/public';

interface Props {
  expressions: ExpressionsStart;
  inspector: InspectorStart;
}

export function RunExpressionsExample({ expressions, inspector }: Props) {
  const [expression, updateExpression] = useState('markdown "## expressions explorer"');
  const [result, updateResult] = useState({});

  const expressionChanged = (value: string) => {
    updateExpression(value);
  };

  const inspectorAdapters = useMemo(
    () => ({
      expression: new ExpressionsInspectorAdapter(),
    }),
    []
  );

  useEffect(() => {
    const runExpression = async () => {
      const execution = expressions.execute(expression, null, {
        debug: true,
        inspectorAdapters,
      });

      const data: any = await execution.getData();
      updateResult(data);
    };

    runExpression();
  }, [expression, expressions, inspectorAdapters]);

  return (
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Run expressions</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText>
                In the below editor you can enter your expression and execute it. Using
                expressions.execute allows you to easily run the expression.
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
              <EuiPanel paddingSize="none" role="figure">
                <EuiCodeBlock
                  language="json"
                  fontSize="m"
                  paddingSize="m"
                  isCopyable
                  data-test-subj="expressionResult"
                >
                  {JSON.stringify(result, null, '\t')}
                </EuiCodeBlock>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
}
