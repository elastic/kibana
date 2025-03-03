/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import moment from 'moment';
import { Timestamp } from './timestamp';

const timestamp = 1617549061000;

describe('Timestamp', () => {
  it('should render both absolute and relative time correctly', () => {
    render(<Timestamp timestamp={timestamp} />);
    const absoluteTime = moment(timestamp).format('MMM D, YYYY @ HH:mm:ss');
    const relativeTime = moment(timestamp).fromNow();

    expect(screen.queryByTestId('docViewerTracesOverviewTimestamp')?.innerHTML).toEqual(
      `${absoluteTime} (${relativeTime})`
    );
  });

  it('should display the relative time correctly for a recent timestamp', () => {
    const recentTimestamp = moment().subtract(10, 'minutes').valueOf();
    render(<Timestamp timestamp={recentTimestamp} />);
    const absoluteTime = moment(recentTimestamp).format('MMM D, YYYY @ HH:mm:ss');
    const relativeTime = moment(recentTimestamp).fromNow();

    expect(screen.queryByTestId('docViewerTracesOverviewTimestamp')?.innerHTML).toEqual(
      `${absoluteTime} (${relativeTime})`
    );
  });
});
