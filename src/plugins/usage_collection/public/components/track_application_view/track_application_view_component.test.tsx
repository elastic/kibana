/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { TrackApplicationViewComponent } from './track_application_view_component';
import { IApplicationUsageTracker } from '../../plugin';
import { fireEvent } from '@testing-library/react';

describe('TrackApplicationViewComponent', () => {
  test('it renders the internal component even when no tracker is provided', () => {
    const component = mountWithIntl(
      <TrackApplicationViewComponent viewId={'testView'}>
        <h1>Hello</h1>
      </TrackApplicationViewComponent>
    );
    component.unmount();
  });

  test('it tracks the component while it is rendered', () => {
    const applicationUsageTrackerMock: jest.Mocked<IApplicationUsageTracker> = {
      trackApplicationViewUsage: jest.fn(),
      flushTrackedView: jest.fn(),
      updateViewClickCounter: jest.fn(),
    };
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).not.toHaveBeenCalled();
    const viewId = 'testView';
    const component = mountWithIntl(
      <TrackApplicationViewComponent
        viewId={viewId}
        applicationUsageTracker={applicationUsageTrackerMock}
      >
        <h1>Hello</h1>
      </TrackApplicationViewComponent>
    );
    expect(applicationUsageTrackerMock.trackApplicationViewUsage).toHaveBeenCalledWith(viewId);
    expect(applicationUsageTrackerMock.updateViewClickCounter).not.toHaveBeenCalled();
    fireEvent.click(component.getDOMNode());
    expect(applicationUsageTrackerMock.updateViewClickCounter).toHaveBeenCalledWith(viewId);
    expect(applicationUsageTrackerMock.flushTrackedView).not.toHaveBeenCalled();
    component.unmount();
    expect(applicationUsageTrackerMock.flushTrackedView).toHaveBeenCalledWith(viewId);
  });
});
