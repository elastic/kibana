/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ApplicationUsageContext, TrackApplicationView } from './track_application_view';
import { IApplicationUsageTracker } from '../../plugin';
import { fireEvent, render } from '@testing-library/react';

describe('TrackApplicationView', () => {
  test('it renders the internal component even when no tracker has been set', () => {
    const { unmount } = render(
      <TrackApplicationView viewId={'testView'}>
        <h1>Hello</h1>
      </TrackApplicationView>
    );
    unmount();
  });

  test('it tracks the component while it is rendered', async () => {
    const applicationUsageTrackerMock: jest.Mocked<IApplicationUsageTracker> = {
      trackApplicationViewUsage: jest.fn(),
      flushTrackedView: jest.fn(),
      updateViewClickCounter: jest.fn(),
    };
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).not.toHaveBeenCalled();
    const viewId = 'testView';
    const { findByText, unmount } = render(
      <ApplicationUsageContext.Provider value={applicationUsageTrackerMock}>
        <TrackApplicationView viewId={viewId}>
          <h1>Hello</h1>
        </TrackApplicationView>
      </ApplicationUsageContext.Provider>
    );
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).toHaveBeenCalledWith(viewId);
    expect(applicationUsageTrackerMock.updateViewClickCounter).not.toHaveBeenCalled();
    const element = await findByText('Hello');
    fireEvent.click(element);
    expect(applicationUsageTrackerMock.updateViewClickCounter).toHaveBeenCalledWith(viewId);
    expect(applicationUsageTrackerMock.flushTrackedView).not.toHaveBeenCalled();
    unmount();
    expect(applicationUsageTrackerMock.flushTrackedView).toHaveBeenCalledWith(viewId);
  });
});
