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
import userEvent from '@testing-library/user-event';
import type { ContextErrorMessageProps } from './context_error_message';
import { ContextErrorMessage } from './context_error_message';
import { FailureReason, LoadingStatus } from '../../services/context_query_state';
import { SurrDocType } from '../../services/context';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';

const DEFAULT_BODY =
  'Please reload or go back to the document list to select a valid anchor document.';
const DEFAULT_TITLE = 'Failed to load the anchor document';

describe('ContextErrorMessage', () => {
  const services = createDiscoverServicesMock();

  const renderComponent = (props: ContextErrorMessageProps) =>
    render(
      <DiscoverTestProvider services={services}>
        <ContextErrorMessage {...props} />
      </DiscoverTestProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when the status is not failed', () => {
    renderComponent({ type: 'anchor', status: { value: LoadingStatus.LOADING } });

    expect(screen.queryByTestId('anchorErrorMsg')).not.toBeInTheDocument();
  });

  it('renders just the title if the reason is not specifically handled', () => {
    renderComponent({ type: 'anchor', status: { value: LoadingStatus.FAILED } });

    expect(screen.getByText(DEFAULT_TITLE)).toBeVisible();
    expect(screen.queryByText(DEFAULT_BODY)).not.toBeInTheDocument();
    expect(screen.queryByTestId('anchorErrorMsgViewDetailsButton')).not.toBeInTheDocument();
  });

  it('renders the tie breaker message for invalid tiebreaker errors', () => {
    renderComponent({
      type: 'anchor',
      status: { value: LoadingStatus.FAILED, reason: FailureReason.INVALID_TIEBREAKER },
    });

    expect(screen.getByText(DEFAULT_TITLE)).toBeVisible();
    expect(screen.getByText('Invalid tie breaker field setting')).toBeVisible();
    expect(screen.queryByText(DEFAULT_BODY)).not.toBeInTheDocument();
  });

  it('renders the error message and opens the error dialog for unknown anchor errors', async () => {
    const user = userEvent.setup();
    const error = new Error('Something went wrong');

    renderComponent({
      type: 'anchor',
      status: { value: LoadingStatus.FAILED, reason: FailureReason.UNKNOWN, error },
    });

    expect(screen.getByText(DEFAULT_TITLE)).toBeVisible();
    expect(screen.getByText('Something went wrong')).toBeVisible();
    expect(screen.getByText(DEFAULT_BODY)).toBeVisible();

    await user.click(screen.getByTestId('anchorErrorMsgViewDetailsButton'));

    expect(services.core.notifications.showErrorDialog).toHaveBeenCalledWith({
      title: DEFAULT_TITLE,
      error,
    });
  });

  it('renders the error message for surrounding documents errors', () => {
    const error = new Error('Something went wrong');

    renderComponent({
      type: SurrDocType.PREDECESSORS,
      status: { value: LoadingStatus.FAILED, reason: FailureReason.UNKNOWN, error },
    });
    renderComponent({
      type: SurrDocType.SUCCESSORS,
      status: { value: LoadingStatus.FAILED, reason: FailureReason.UNKNOWN, error },
    });

    expect(screen.getByTestId('predecessorsErrorMsg')).toHaveTextContent(
      'Failed to load newer documents'
    );
    expect(screen.getByTestId('successorsErrorMsg')).toHaveTextContent(
      'Failed to load older documents'
    );
    expect(screen.getAllByText('Something went wrong')).toHaveLength(2);
    expect(screen.queryByText(DEFAULT_BODY)).not.toBeInTheDocument();
  });
});
