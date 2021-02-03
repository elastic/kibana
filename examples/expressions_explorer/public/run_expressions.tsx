/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
