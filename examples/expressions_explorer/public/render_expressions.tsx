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
  EuiButton,
} from '@elastic/eui';
import { ExpressionsStart } from '../../../src/plugins/expressions/public';
import { ExpressionEditor } from './editor/expression_editor';
import { Start as InspectorStart } from '../../../src/plugins/inspector/public';

interface Props {
  expressions: ExpressionsStart;
  inspector: InspectorStart;
}

export function RenderExpressionsExample({ expressions, inspector }: Props) {
  const [expression, updateExpression] = useState(
    'markdownVis "## expressions explorer rendering"'
  );

  const expressionChanged = (value: string) => {
    updateExpression(value);
  };

  const inspectorAdapters = {};

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
                <expressions.ReactExpressionRenderer
                  expression={expression}
                  debug={true}
                  onData$={(result, panels) => {
                    Object.assign(inspectorAdapters, panels);
                  }}
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
