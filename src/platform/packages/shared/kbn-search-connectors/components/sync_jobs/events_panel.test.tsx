/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

import { TriggerMethod } from '../..';

import { SyncJobEventsPanel } from './events_panel';

describe('EventsPanel', () => {
  const events = {
    cancelationRequestedAt: '2022-10-24T02:44:19.660365+00:00',
    canceledAt: '2022-10-24T02:44:19.660365+00:00',
    completed: '2022-10-24T02:44:19.660365+00:00',
    lastUpdated: '2022-10-24T02:44:19.660365+00:00',
    syncRequestedAt: '2022-10-24T02:44:19.660365+00:00',
    syncStarted: '2022-10-24T02:44:19.660365+00:00',
    triggerMethod: TriggerMethod.ON_DEMAND,
  };

  it('renders', () => {
    renderWithKibanaRenderContext(<SyncJobEventsPanel {...events} />);

    expect(screen.getByText('Sync requested manually')).toBeInTheDocument();
    expect(screen.getByText('Sync started')).toBeInTheDocument();
    expect(screen.getByText('Last updated')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Cancelation requested')).toBeInTheDocument();
    expect(screen.getByText('Canceled')).toBeInTheDocument();
  });

  it('renders with some values missing', () => {
    renderWithKibanaRenderContext(
      <SyncJobEventsPanel
        {...events}
        cancelationRequestedAt=""
        triggerMethod={TriggerMethod.ON_DEMAND}
      />
    );

    expect(screen.queryByText('Cancelation requested')).not.toBeInTheDocument();
    expect(screen.getByText('Canceled')).toBeInTheDocument();
    expect(screen.getByText('Sync requested manually')).toBeInTheDocument();
  });
});
