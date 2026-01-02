/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useEsqlInspector } from '../../../../context';
import { useBehaviorSubject } from '../../../../../../hooks/use_behavior_subject';
import { FromCommand } from './components/from_command';
import { LimitCommand } from './components/limit_command';

export const PreviewUi: React.FC = (props) => {
  const state = useEsqlInspector();
  const query = useBehaviorSubject(state.queryLastValid$);
  const [sourceStatement, ...statements] = useBehaviorSubject(state.pipeStatements$);

  if (!query) {
    return null;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiSpacer />
        <FromCommand />
        <EuiSpacer />
        <LimitCommand />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSpacer />
        <h2>ComposerQuery API: Pipe method</h2>
        <EuiSpacer />
        <EuiCodeBlock language="typescript" isCopyable>
          import &#123; esql &#125; from &#39;@kbn/esql-language&#39;;
          <EuiSpacer />
          const query = esql`{sourceStatement}`;{'\n'}
          {statements.map((statement) => {
            return `query.pipe('${statement}');\n`;
          })}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
