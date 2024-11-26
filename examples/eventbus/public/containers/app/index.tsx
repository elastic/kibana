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

import { DateHistogram } from '../../components/date_histogram';
import { Esql } from '../../components/esql';
import { Fields } from '../../components/fields';
import { Logs } from '../../components/logs';
import { State } from '../../components/state';

import { useEventBusExampleState } from '../../hooks/use_event_bus_example_state';

export const App: FC = () => {
  const state = useEventBusExampleState();
  // find all selectedFields of type date in allFields
  const dateFields = state.useState((s) =>
    Object.entries(s.allFields)
      .filter(([name, type]) => {
        return s.selectedFields.includes(name) && type === 'date';
      })
      .map((d) => d[0])
  );

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
                <EuiFlexGroup direction="column" gutterSize="s">
                  {dateFields.map((field) => (
                    <EuiFlexItem key={field} grow={false}>
                      <DateHistogram field={field} />
                    </EuiFlexItem>
                  ))}
                  <EuiFlexItem>
                    <Logs />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
};
