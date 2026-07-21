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
import { useFlyoutHistoryKey } from '../../../doc_viewer_flyout/flyout_history_key_context';

jest.mock('../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

jest.mock('../../../doc_viewer_flyout/flyout_history_key_context', () => ({
  useFlyoutHistoryKey: jest.fn(() => undefined),
}));

const SERVICE_NAME = 'opbeans-java';
const APM_HREF = 'http://apm/services/opbeans-java';
const ENVIRONMENT_ALL = 'ENVIRONMENT_ALL';

const mockGetTime = jest.fn(() => ({ from: 'now-15m', to: 'now' }));
const mockGetRedirectUrl = jest.fn(() => APM_HREF);
const mockNavigate = jest.fn();
const mockGetById = jest.fn(() => undefined as any);

const mockRenderServiceFlyout = jest.fn(({ onClose }: { onClose: () => void }) => (
  <div data-test-subj="serviceFlyoutMock">
    <button data-test-subj="closeFlyout" onClick={onClose}>
      Close
    </button>
  </div>
));

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

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (getUnifiedDocViewerServices as jest.Mock).mockReturnValue(mockServices);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ServiceNameLink with service flyout feature registered', () => {
  beforeEach(() => {
    mockGetById.mockReturnValue({
      id: 'observability-service-flyout',
      renderServiceFlyout: mockRenderServiceFlyout,
    });
  });

  it('does not render the flyout until the link is clicked', () => {
    render(<ServiceNameLink {...defaultProps} />);

    expect(screen.queryByTestId('serviceFlyoutMock')).not.toBeInTheDocument();
  });

  it('renders the flyout after clicking the link', () => {
    render(<ServiceNameLink {...defaultProps} />);

    fireEvent.click(screen.getByTestId('serviceNameLink'));

    expect(screen.getByTestId('serviceFlyoutMock')).toBeInTheDocument();
  });

  it('closes the flyout when onClose is called', () => {
    render(<ServiceNameLink {...defaultProps} />);

    fireEvent.click(screen.getByTestId('serviceNameLink'));
    expect(screen.getByTestId('serviceFlyoutMock')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('closeFlyout'));
    expect(screen.queryByTestId('serviceFlyoutMock')).not.toBeInTheDocument();
  });

  it('passes serviceName, agentName, environment and time range to renderServiceFlyout', () => {
    mockGetTime.mockReturnValue({ from: 'now-30m', to: 'now' });

    render(<ServiceNameLink {...defaultProps} agentName="java" />);
    fireEvent.click(screen.getByTestId('serviceNameLink'));

    expect(mockRenderServiceFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: SERVICE_NAME,
        agentName: 'java',
        environment: ENVIRONMENT_ALL,
        rangeFrom: 'now-30m',
        rangeTo: 'now',
      })
    );
  });

  it('passes undefined agentName when not provided', () => {
    render(<ServiceNameLink {...defaultProps} />);
    fireEvent.click(screen.getByTestId('serviceNameLink'));

    expect(mockRenderServiceFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ agentName: undefined })
    );
  });

  it('forwards flyoutHistoryKey to renderServiceFlyout when inside a flyout context', () => {
    const historyKey = Symbol('test-history-key');
    (useFlyoutHistoryKey as jest.Mock).mockReturnValue(historyKey);

    render(<ServiceNameLink {...defaultProps} />);
    fireEvent.click(screen.getByTestId('serviceNameLink'));

    expect(mockRenderServiceFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ flyoutHistoryKey: historyKey })
    );
  });

  it('passes undefined flyoutHistoryKey when not inside a flyout context', () => {
    render(<ServiceNameLink {...defaultProps} />);
    fireEvent.click(screen.getByTestId('serviceNameLink'));

    expect(mockRenderServiceFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ flyoutHistoryKey: undefined })
    );
  });
});

describe('ServiceNameLink without service flyout feature', () => {
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
