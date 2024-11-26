/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPageTemplate, EuiSpacer } from '@elastic/eui';

import { Esql } from '../../components/esql';
import { Fields } from '../../components/fields';
import { Logs } from '../../components/logs';
import { State } from '../../components/state';

export const App: FC = () => {
  return (
    <>
      <State />
      <EuiPageTemplate restrictWidth={false} offset={0}>
        <EuiPageTemplate.Section>
          <Esql />
          <EuiSpacer size="s" />
          <div data-test-id="eventBusExampleLogs" css={{ width: '100%' }}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <Fields />
              </EuiFlexItem>
              <EuiFlexItem css={{ minWidth: 0, overflow: 'hidden' }}>
                <Logs />
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
};
