/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { EsqlInspectorState } from './esql_inspector_state';
import { Editor } from './components/editor';
import { Preview } from './components/preview';

export interface EsqlInspectorConnectedProps {
  state?: EsqlInspectorState;
}

export const EsqlInspectorConnected: React.FC<EsqlInspectorConnectedProps> = (props) => {
  return (
    <>
      <EuiFlexGroup style={{ maxWidth: 1200 }}>
        <EuiFlexItem>
          <Editor />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiFlexGroup style={{ maxWidth: 1200 }}>
        <EuiFlexItem>
          <Preview />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
