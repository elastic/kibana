/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC } from 'react';

import { EuiBadge } from '@elastic/eui';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';

export const Options: FC = () => {
  const state = useEventBusExampleState();
  const aiopsEnabled = state.useState((s) => s.aiopsEnabled);
  const genaiEnabled = state.useState((s) => s.genaiEnabled);

  return (
    <>
      <div css={{ padding: '2px', display: 'inline-block' }}>
        <EuiBadge
          color={aiopsEnabled ? 'primary' : 'lightgray'}
          onClick={() => state.actions.setAiopsEnabled(!aiopsEnabled)}
        >
          AIOps
        </EuiBadge>
        <EuiBadge
          color={genaiEnabled ? 'primary' : 'lightgray'}
          onClick={() => state.actions.setGenAIEnabled(!genaiEnabled)}
        >
          GenAI
        </EuiBadge>
      </div>
    </>
  );
};
