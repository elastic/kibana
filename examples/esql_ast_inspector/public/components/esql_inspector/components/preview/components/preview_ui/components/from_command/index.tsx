/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EuiButton, EuiFormRow, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { Builder, ESQLSource } from '@kbn/esql-ast';
import { useEsqlInspector } from '../../../../../../context';
import { useBehaviorSubject } from '../../../../../../../../hooks/use_behavior_subject';
import { Source } from './source';

export const FromCommand: React.FC = () => {
  const state = useEsqlInspector();
  const from = useBehaviorSubject(state.from$);

  if (!from) {
    return null;
  }

  const sources: React.ReactNode[] = [];
  let i = 0;

  for (const arg of from.args) {
    if ((arg as any).type !== 'source') continue;
    sources.push(<Source key={i} index={i + 1} node={arg as ESQLSource} />);
    i++;
  }

  return (
    <EuiPanel hasShadow={false} hasBorder style={{ maxWidth: 360 }}>
      <EuiTitle size="xxs">
        <h3>Sources</h3>
      </EuiTitle>
      <div
        css={{
          paddingTop: 4,
        }}
      >
        {sources}
      </div>
      <EuiSpacer size={'m'} />
      <EuiFormRow fullWidth>
        <EuiButton
          fullWidth
          size={'s'}
          color="text"
          onClick={() => {
            const length = from.args.length;
            const source = Builder.expression.source({
              name: `source${length + 1}`,
              sourceType: 'index',
            });
            from.args.push(source);
            state.reprint();
          }}
        >
          Add source
        </EuiButton>
      </EuiFormRow>
    </EuiPanel>
  );
};
