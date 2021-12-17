/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { ExpressionsStart } from '../../../src/plugins/expressions/public';
import { ExpressionEditor } from './editor/expression_editor';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';

interface Props {
  expressions: ExpressionsStart;
  actions: UiActionsStart;
}

export function ActionsExpressionsExample2({ expressions, actions }: Props) {
  const [expression, updateExpression] = useState(
    'button name="click me" href="http://www.google.com" color={var color}'
  );

  const [variables, updateVariables] = useState({
    color: 'blue',
  });

  const expressionChanged = (value: string) => {
    updateExpression(value);
  };

  const handleEvents = (event: any) => {
    updateVariables({ color: event.data.href === 'http://www.google.com' ? 'red' : 'blue' });
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
        <EuiPageContentBody data-test-subj="expressionsVariablesTest">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText>
                This example is similar to previous one, but clicking the button will rerender the
                expression with new set of variables.
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
              <EuiPanel paddingSize="none" role="figure">
                <expressions.ReactExpressionRenderer
                  data-test-subj="expressionsVariablesTestRenderer"
                  expression={expression}
                  debug={true}
                  variables={variables}
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
