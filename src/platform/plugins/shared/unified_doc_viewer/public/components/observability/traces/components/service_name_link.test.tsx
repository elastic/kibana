/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ServiceNameLink } from './service_name_link';
import { getUnifiedDocViewerServices } from '../../../../plugin';

jest.mock('../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

describe('ServiceNameLink', () => {
  const getRedirectUrl = jest.fn();
  const navigate = jest.fn();

  const mockServices = ({
    canViewApm = true,
    cpsEnabled = false,
    hasLocator = true,
  }: {
    canViewApm?: boolean;
    cpsEnabled?: boolean;
    hasLocator?: boolean;
  } = {}) => {
    (getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
      share: {
        url: {
          locators: {
            get: hasLocator
              ? jest.fn(() => ({ getRedirectUrl, navigate }))
              : jest.fn(() => undefined),
          },
        },
      },
      core: {
        application: {
          capabilities: {
            apm: { show: canViewApm },
          },
        },
      },
      data: {
        query: {
          timefilter: {
            timefilter: {
              getTime: jest.fn(() => ({ from: 'now-15m', to: 'now' })),
            },
          },
        },
      },
      cps: cpsEnabled ? { cpsManager: {} } : undefined,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getRedirectUrl.mockReturnValue('/app/apm/services/my-service');
  });

  it('renders link when APM is visible, locator exists, and CPS is disabled', () => {
    mockServices();

    const { getByTestId } = render(
      <ServiceNameLink
        serviceName="my-service"
        formattedServiceName="my-service"
        data-test-subj="serviceNameLink"
      />
    );

    expect(getByTestId('serviceNameLink')).toHaveAttribute('href', '/app/apm/services/my-service');
  });

  it('renders plain content when CPS is enabled', () => {
    mockServices({ cpsEnabled: true });

    const { queryByTestId, getByText } = render(
      <ServiceNameLink
        serviceName="my-service"
        formattedServiceName="my-service"
        data-test-subj="serviceNameLink"
      />
    );

    expect(getByText('my-service')).toBeInTheDocument();
    expect(queryByTestId('serviceNameLink')).not.toBeInTheDocument();
  });

  it('renders plain content when APM capability is not available', () => {
    mockServices({ canViewApm: false });

    const { queryByTestId, getByText } = render(
      <ServiceNameLink
        serviceName="my-service"
        formattedServiceName="my-service"
        data-test-subj="serviceNameLink"
      />
    );

    expect(getByText('my-service')).toBeInTheDocument();
    expect(queryByTestId('serviceNameLink')).not.toBeInTheDocument();
  });

  it('renders plain content when service locator is unavailable', () => {
    mockServices({ hasLocator: false });

    const { queryByTestId, getByText } = render(
      <ServiceNameLink
        serviceName="my-service"
        formattedServiceName="my-service"
        data-test-subj="serviceNameLink"
      />
    );

    expect(getByText('my-service')).toBeInTheDocument();
    expect(queryByTestId('serviceNameLink')).not.toBeInTheDocument();
  });

  it('navigates via locator on click', () => {
    mockServices();

    const { getByTestId } = render(
      <ServiceNameLink
        serviceName="my-service"
        formattedServiceName="my-service"
        data-test-subj="serviceNameLink"
      />
    );

    fireEvent.click(getByTestId('serviceNameLink'));

    expect(navigate).toHaveBeenCalledWith({
      serviceName: 'my-service',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    });
  });
});
