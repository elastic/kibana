/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC } from 'react';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';

import { Aiops } from './aiops';

export const AiopsWrapper: FC = () => {
  const state = useEventBusExampleState();
  const aiopsFieldCandidates = state.useState((s) => s.aiopsFieldCandidates);
  const filters = state.useState((s) => s.filters);

  if (Object.values(filters).length === 0) {
    return null;
  }

  return (
    <div css={{ margin: '8px 0' }}>
      AIOps Significant Items Analysis
      <br />
      {aiopsFieldCandidates.map((field) => {
        return <Aiops field={field} key={field} />;
      })}
    </div>
  );
};
