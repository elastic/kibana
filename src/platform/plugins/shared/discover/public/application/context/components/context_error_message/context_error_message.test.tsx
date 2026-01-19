/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ContextErrorMessage } from './context_error_message';
import { FailureReason, LoadingStatus } from '../../services/context_query_state';
import { render, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

const DEFAULT_BODY =
  'Please reload or go back to the document list to select a valid anchor document.';
const DEFAULT_TITLE = 'Failed to load the anchor document';

describe('loading spinner', () => {
  it('ContextErrorMessage does not render on loading', () => {
    render(<ContextErrorMessage status={{ value: LoadingStatus.LOADING }} />);

    expect(screen.queryByTestId('contextErrorMessageTitle')).not.toBeInTheDocument();
  });

  it('ContextErrorMessage does not render on success loading', () => {
    render(<ContextErrorMessage status={{ value: LoadingStatus.LOADED }} />);

    expect(screen.queryByTestId('contextErrorMessageTitle')).not.toBeInTheDocument();
  });

  it('ContextErrorMessage does not render on uninitialized loading', () => {
    render(<ContextErrorMessage status={{ value: LoadingStatus.UNINITIALIZED }} />);

    expect(screen.queryByTestId('contextErrorMessageTitle')).not.toBeInTheDocument();
  });

  it('ContextErrorMessage renders just the title if the reason is not specifically handled', () => {
    renderWithI18n(<ContextErrorMessage status={{ value: LoadingStatus.FAILED }} />);

    expect(screen.getByText(DEFAULT_TITLE)).toBeVisible();
    expect(screen.queryByText(DEFAULT_BODY)).not.toBeInTheDocument();
  });

  it('ContextErrorMessage does not render the reason for invalid tiebreaker errors', () => {
    renderWithI18n(
      <ContextErrorMessage
        status={{ value: LoadingStatus.FAILED, reason: FailureReason.INVALID_TIEBREAKER }}
      />
    );

    expect(screen.getByText(DEFAULT_TITLE)).toBeVisible();
    expect(screen.queryByText(DEFAULT_BODY)).not.toBeInTheDocument();
  });

  it('ContextErrorMessage renders the reason for unknown errors', () => {
    renderWithI18n(
      <ContextErrorMessage
        status={{ value: LoadingStatus.FAILED, reason: FailureReason.UNKNOWN }}
      />
    );

    expect(screen.getByText(DEFAULT_TITLE)).toBeVisible();
    expect(screen.getByText(DEFAULT_BODY)).toBeVisible();
  });
});
