/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { RowControlComponent } from '@kbn/discover-utils';
import type { RowControlRowProps } from '@kbn/discover-utils';
import { ExploreInSecurity } from './explore_in_security';
import { EuiButton } from '@elastic/eui';
import type { ProfileProviderServices } from '../../../profile_provider_services';

const TEST_TIMELINE_URL = 'test-timeline-url';

const mockGetUrlForApp = jest.fn().mockReturnValue(TEST_TIMELINE_URL);

const mockDiscoverServices = {
  application: {
    getUrlForApp: mockGetUrlForApp,
  },
} as unknown as ProfileProviderServices;

const mockRow = {
  'kibana.alert.reason': 'test-reason',
  'kibana.alert.rule.description': 'test-description',
  'event.kind': 'signal',
  _id: 'test-id',
  '@timestamp': '2021-08-02T14:00:00.000Z',
  'kibana.alert.url': 'test-url',
};

const mockRowProps = {
  record: {
    flattened: mockRow,
  },
} as unknown as RowControlRowProps;

const mockWindowOpen = jest.fn();

jest.spyOn(window, 'open').mockImplementation(mockWindowOpen);

const MockControl: RowControlComponent = ({ iconType, onClick, label }) => {
  const onButtonClick = () => {
    onClick?.({} as RowControlRowProps);
  };
  return (
    <EuiButton iconType={iconType} onClick={onButtonClick}>
      {label}
    </EuiButton>
  );
};

describe('Explore In Security Control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('should return the alert control correctly', () => {
    render(
      <ExploreInSecurity
        rowProps={mockRowProps}
        Control={MockControl}
        services={mockDiscoverServices}
      />
    );

    expect(screen.getByText('Explore alert in Security')).toBeVisible();
    fireEvent.click(screen.getByText('Explore alert in Security'));
    expect(mockWindowOpen).toHaveBeenCalledWith('test-url', '_blank');
  });

  test('should return the event control correctly', () => {
    const mockEventRowProps = {
      ...mockRowProps,
      record: {
        flattened: {
          ...mockRow,
          'event.kind': 'event',
        },
      },
    } as unknown as RowControlRowProps;

    const expectedEventURL = `${TEST_TIMELINE_URL}?timeline=(activeTab:query,isOpen:!t,query:(expression:'_id: ${mockRow._id}',kind:kuery))&timerange=(timeline:(timerange:(from:'${mockRow['@timestamp']}',kind:absolute,to:'${mockRow['@timestamp']}')))&timelineFlyout=(right:(id:document-details-right,params:(id:${mockRow._id},scopeId:timeline-1)))`;

    render(
      <ExploreInSecurity
        rowProps={mockEventRowProps}
        Control={MockControl}
        services={mockDiscoverServices}
      />
    );

    expect(screen.getByText('Explore event in Security')).toBeVisible();
    fireEvent.click(screen.getByText('Explore event in Security'));
    expect(mockWindowOpen).toHaveBeenCalledWith(expectedEventURL, '_blank');
  });
});
