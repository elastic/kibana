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
import { DependencyNameLink } from './dependency_name_link';
import { getUnifiedDocViewerServices } from '../../../../plugin';

jest.mock('../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

jest.mock('@kbn/apm-ui-shared', () => ({
  SpanIcon: () => <span data-test-subj="spanIcon" />,
}));

describe('DependencyNameLink', () => {
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
    getRedirectUrl.mockReturnValue('/app/apm/dependencies/my-dependency');
  });

  it('renders link when APM is visible, locator exists, and CPS is disabled', () => {
    mockServices();

    const { getByTestId } = render(
      <DependencyNameLink dependencyName="my-dependency" formattedDependencyName="my-dependency" />
    );

    expect(getByTestId('unifiedDocViewSpanOverviewDependencyNameLink')).toHaveAttribute(
      'href',
      '/app/apm/dependencies/my-dependency'
    );
  });

  it('renders plain content when CPS is enabled', () => {
    mockServices({ cpsEnabled: true });

    const { queryByTestId, getByText } = render(
      <DependencyNameLink dependencyName="my-dependency" formattedDependencyName="my-dependency" />
    );

    expect(getByText('my-dependency')).toBeInTheDocument();
    expect(queryByTestId('unifiedDocViewSpanOverviewDependencyNameLink')).not.toBeInTheDocument();
  });

  it('renders plain content when APM capability is unavailable', () => {
    mockServices({ canViewApm: false });

    const { queryByTestId, getByText } = render(
      <DependencyNameLink dependencyName="my-dependency" formattedDependencyName="my-dependency" />
    );

    expect(getByText('my-dependency')).toBeInTheDocument();
    expect(queryByTestId('unifiedDocViewSpanOverviewDependencyNameLink')).not.toBeInTheDocument();
  });

  it('renders plain content when dependency locator is unavailable', () => {
    mockServices({ hasLocator: false });

    const { queryByTestId, getByText } = render(
      <DependencyNameLink dependencyName="my-dependency" formattedDependencyName="my-dependency" />
    );

    expect(getByText('my-dependency')).toBeInTheDocument();
    expect(queryByTestId('unifiedDocViewSpanOverviewDependencyNameLink')).not.toBeInTheDocument();
  });

  it('navigates via locator on click', () => {
    mockServices();

    const { getByTestId } = render(
      <DependencyNameLink
        dependencyName="my-dependency"
        environment="production"
        formattedDependencyName="my-dependency"
      />
    );

    fireEvent.click(getByTestId('unifiedDocViewSpanOverviewDependencyNameLink'));

    expect(navigate).toHaveBeenCalledWith({
      dependencyName: 'my-dependency',
      environment: 'production',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    });
  });
});
