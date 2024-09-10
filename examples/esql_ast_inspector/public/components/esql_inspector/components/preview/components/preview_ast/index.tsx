/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiCode } from '@elastic/eui';
import { useEsqlInspector } from '../../../../context';
import { useBehaviorSubject } from '../../../../../../hooks/use_behavior_subject';

export const PreviewAst: React.FC = (props) => {
  const state = useEsqlInspector();
  const query = useBehaviorSubject(state.queryLastValid$);

  if (!query) {
    return null;
  }

  return (
    <EuiCode>
      <pre style={{ padding: '0 8px', fontSize: 10 }}>
        <code>{JSON.stringify(query.ast, null, 2)}</code>
      </pre>
    </EuiCode>
  );
};
