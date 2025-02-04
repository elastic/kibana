/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC } from 'react';

import { CodeEditor } from '@kbn/code-editor';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';

export const Esql: FC = () => {
  const state = useEventBusExampleState();
  const esql = state.useState((s) => s.esql);

  return (
    <div data-test-id="eventBusExampleESQL" css={{ border: '1px solid #999' }}>
      <CodeEditor
        height={70}
        languageId="esql"
        options={{
          automaticLayout: true,
          lineNumbers: 'on',
          tabSize: 2,
        }}
        value={esql}
        onChange={(d) => state.actions.setESQL(d)}
        data-test-subj="jsSandboxEmbeddableConfigEsql"
      />
    </div>
  );
};
