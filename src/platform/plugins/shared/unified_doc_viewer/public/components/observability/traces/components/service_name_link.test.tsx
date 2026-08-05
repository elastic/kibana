/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ServiceNameLink } from './service_name_link';
import { getUnifiedDocViewerServices } from '../../../../plugin';

jest.mock('../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

const SERVICE_NAME = 'opbeans-java';
const APM_HREF = 'http://apm/services/opbeans-java';

const mockGetTime = jest.fn(() => ({ from: 'now-15m', to: 'now' }));
const mockGetRedirectUrl = jest.fn(() => APM_HREF);
const mockNavigate = jest.fn();
const mockGetById = jest.fn(() => undefined as any);

const mockServices = {
  share: {
    url: {
      locators: {
        get: jest.fn(() => ({
          getRedirectUrl: mockGetRedirectUrl,
          navigate: mockNavigate,
        })),
      },
    },
  },
  core: {
    application: {
      capabilities: { apm: { show: true } },
    },
  },
  data: {
    query: {
      timefilter: {
        timefilter: { getTime: mockGetTime },
      },
    },
  },
  discoverShared: {
    features: {
      registry: { getById: mockGetById },
    },
  },
};

const defaultProps = {
  serviceName: SERVICE_NAME,
  formattedServiceName: SERVICE_NAME,
  'data-test-subj': 'serviceNameLink',
  ebt: { element: 'test-element' as any },
};

beforeEach(() => {
  jest.clearAllMocks();
  (getUnifiedDocViewerServices as jest.Mock).mockReturnValue(mockServices);
});

describe('ServiceNameLink with service flyout feature registered', () => {
  beforeEach(() => {
    mockGetById.mockReturnValue({
      id: 'observability-service-flyout',
      renderServiceFlyout: jest.fn(),
    });
  });

  it('does not render a flyout itself', () => {
    render(<ServiceNameLink {...defaultProps} />);

    expect(screen.queryByTestId('serviceFlyout')).not.toBeInTheDocument();
  });

  it('calls onClick when the link is clicked', () => {
    const onClick = jest.fn();
    render(<ServiceNameLink {...defaultProps} onClick={onClick} />);

    fireEvent.click(screen.getByTestId('serviceNameLink'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders plain text when the user has no APM access, even if the flyout feature is registered', () => {
    (getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
      ...mockServices,
      core: { application: { capabilities: { apm: { show: false } } } },
    });

    render(<ServiceNameLink {...defaultProps} />);

    expect(screen.queryByTestId('serviceNameLink')).not.toBeInTheDocument();
    expect(screen.getByText(SERVICE_NAME)).toBeInTheDocument();
  });
});

describe('ServiceNameLink without service flyout feature', () => {
  beforeEach(() => {
    mockGetById.mockReturnValue(undefined);
  });

  it('renders an APM navigation link when the user has APM access', () => {
    render(<ServiceNameLink {...defaultProps} />);

    expect(screen.getByTestId('serviceNameLink').closest('a')).toHaveAttribute('href', APM_HREF);
  });

  it('renders plain text when the user has no APM access', () => {
    (getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
      ...mockServices,
      core: { application: { capabilities: { apm: { show: false } } } },
    });

    render(<ServiceNameLink {...defaultProps} />);

    expect(screen.queryByTestId('serviceNameLink')).not.toBeInTheDocument();
    expect(screen.getByText(SERVICE_NAME)).toBeInTheDocument();
  });

  it('renders plain text when the APM locator is not available', () => {
    (getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
      ...mockServices,
      share: { url: { locators: { get: jest.fn(() => undefined) } } },
    });

    render(<ServiceNameLink {...defaultProps} />);

    expect(screen.queryByTestId('serviceNameLink')).not.toBeInTheDocument();
    expect(screen.getByText(SERVICE_NAME)).toBeInTheDocument();
  });
});
