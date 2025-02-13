/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { shallow } from 'enzyme';

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
    const wrapper = shallow(<SyncJobEventsPanel {...events} />);

    expect(wrapper).toMatchSnapshot();
  });
  it('renders with some values missing', () => {
    const wrapper = shallow(
      <SyncJobEventsPanel
        {...events}
        cancelationRequestedAt=""
        triggerMethod={TriggerMethod.ON_DEMAND}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
