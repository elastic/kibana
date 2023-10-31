/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { shallow } from 'enzyme';

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
  it('renders', () => {
    const wrapper = shallow(<SyncJobCallouts syncJob={syncJob} />);

    expect(wrapper).toMatchSnapshot();
  });
  it('renders error job', () => {
    const wrapper = shallow(<SyncJobCallouts syncJob={{ ...syncJob, status: SyncStatus.ERROR }} />);

    expect(wrapper).toMatchSnapshot();
  });
  it('renders canceled job', () => {
    const wrapper = shallow(
      <SyncJobCallouts syncJob={{ ...syncJob, status: SyncStatus.CANCELED }} />
    );

    expect(wrapper).toMatchSnapshot();
  });
  it('renders in progress job', () => {
    const wrapper = shallow(
      <SyncJobCallouts syncJob={{ ...syncJob, status: SyncStatus.IN_PROGRESS }} />
    );

    expect(wrapper).toMatchSnapshot();
  });
  it('renders different trigger method', () => {
    const wrapper = shallow(
      <SyncJobCallouts
        syncJob={{
          ...syncJob,
          status: SyncStatus.IN_PROGRESS,
          trigger_method: TriggerMethod.SCHEDULED,
        }}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
