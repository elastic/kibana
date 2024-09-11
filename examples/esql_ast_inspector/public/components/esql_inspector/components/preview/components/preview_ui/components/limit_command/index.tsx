/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import { useEsqlInspector } from '../../../../../../context';
import { useBehaviorSubject } from '../../../../../../../../hooks/use_behavior_subject';

export const LimitCommand: React.FC = () => {
  const state = useEsqlInspector();
  const limit = useBehaviorSubject(state.limit$);

  if (!limit) {
    return null;
  }

  const value = +(limit.args[0] as any)?.value;

  if (!value) {
    return null;
  }

  return (
    <EuiPanel hasShadow={false} hasBorder style={{ maxWidth: 360 }}>
      <EuiTitle size="xxs">
        <h3>Limit</h3>
      </EuiTitle>
      <div
        css={{
          paddingTop: 16,
        }}
      >
        {value}
      </div>
    </EuiPanel>
  );
};
