/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useDataPoolerState } from '../../lib';
import { Toolbar } from './toolbar';

export function ESQLDataPooler() {
  const state = useDataPoolerState();

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <Toolbar />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText>
          <div>
            <h1>ESQL Data Pooler</h1>
            <p>Query: {state.currentQueryString}</p>
          </div>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
