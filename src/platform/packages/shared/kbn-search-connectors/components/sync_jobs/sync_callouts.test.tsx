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

import { SyncJobType, SyncStatus, TriggerMethod } from '../..';

import { SyncJobCallouts } from './sync_callouts';

describe('SyncCalloutsPanel', () => {
  const syncJob = {
    cancelation_requested_at: null,
    canceled_at: null,
    completed_at: '2022-09-05T15:59:39.816+00:00',
    connector: {
      configuration: {},
      filtering: null,
      id: 'we2284IBjobuR2-lAuXh',
      index_name: 'indexName',
      language: '',
      pipeline: null,
      service_type: '',
    },
    created_at: '2022-09-05T14:59:39.816+00:00',
    deleted_document_count: 20,
    error: null,
    id: 'id',
    indexed_document_count: 50,
    indexed_document_volume: 40,
    job_type: SyncJobType.FULL,
    last_seen: '2022-09-05T15:59:39.816+00:00',
    metadata: {},
    started_at: '2022-09-05T14:59:39.816+00:00',
    status: SyncStatus.COMPLETED,
    total_document_count: null,
    trigger_method: TriggerMethod.ON_DEMAND,
    worker_hostname: 'hostname_fake',
  };

  it('renders the sync complete callout', () => {
    renderWithKibanaRenderContext(<SyncJobCallouts syncJob={syncJob} />);

    expect(screen.getByText('Sync complete')).toBeInTheDocument();
    expect(screen.getByText('Sync started manually')).toBeInTheDocument();
  });

  it('renders the sync failure callout for an error job', () => {
    renderWithKibanaRenderContext(
      <SyncJobCallouts syncJob={{ ...syncJob, status: SyncStatus.ERROR }} />
    );

    expect(screen.getByText('Sync failure')).toBeInTheDocument();
  });

  it('renders the sync canceled callout for a canceled job', () => {
    renderWithKibanaRenderContext(
      <SyncJobCallouts syncJob={{ ...syncJob, status: SyncStatus.CANCELED }} />
    );

    expect(screen.getByText('Sync canceled')).toBeInTheDocument();
  });

  it('renders the in progress callout', () => {
    renderWithKibanaRenderContext(
      <SyncJobCallouts syncJob={{ ...syncJob, status: SyncStatus.IN_PROGRESS }} />
    );

    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('renders "sync started by schedule" for a scheduled trigger', () => {
    renderWithKibanaRenderContext(
      <SyncJobCallouts
        syncJob={{
          ...syncJob,
          status: SyncStatus.IN_PROGRESS,
          trigger_method: TriggerMethod.SCHEDULED,
        }}
      />
    );

    expect(screen.getByText('Sync started by schedule')).toBeInTheDocument();
    expect(screen.queryByText('Sync started manually')).not.toBeInTheDocument();
  });
});
