/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ErrorCallout } from './error_callout';

const mockRenderSearchError = jest.fn();

jest.mock('@kbn/search-errors', () => {
  const originalModule = jest.requireActual('@kbn/search-errors');

  return {
    ...originalModule,
    renderSearchError: () => mockRenderSearchError(),
  };
});

const renderErrorCallout = (ui: React.ReactElement) =>
  render(<EuiProvider highContrastMode={false}>{ui}</EuiProvider>);

describe('ErrorCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockRenderSearchError.mockReset();
  });

  it('should render', () => {
    const ERROR = new Error('My error');
    const TITLE = 'Error title';

    renderErrorCallout(<ErrorCallout error={ERROR} title={TITLE} showErrorDialog={jest.fn()} />);

    expect(screen.getByText(TITLE)).toBeVisible();
    expect(screen.getByText(ERROR.message)).toBeVisible();
    expect(screen.getByRole('button', { name: /view details/i })).toBeVisible();
  });

  it('should render with override display', () => {
    const ERROR = new Error('My error');
    const OVERWRITE_DISPLAY = <div data-test-subj="discoverErrorCalloutBody">Override display</div>;
    const OVERWRITE_TITLE = 'Override title';

    mockRenderSearchError.mockReturnValue({ body: OVERWRITE_DISPLAY, title: OVERWRITE_TITLE });
    renderErrorCallout(
      <ErrorCallout error={ERROR} title="Original title" showErrorDialog={jest.fn()} />
    );

    expect(screen.getByText(OVERWRITE_TITLE)).toBeVisible();
    expect(screen.getByTestId('discoverErrorCalloutBody')).toBeVisible();
    expect(screen.queryByText(ERROR.message)).not.toBeInTheDocument();
    expect(screen.queryByTestId('discoverErrorCalloutShowDetailsButton')).not.toBeInTheDocument();
  });

  it('should call showErrorDialog when the button is clicked', async () => {
    const ERROR = new Error('My error');
    const TITLE = 'Error title';
    const showErrorDialog = jest.fn();
    const user = userEvent.setup();

    renderErrorCallout(
      <ErrorCallout error={ERROR} title={TITLE} showErrorDialog={showErrorDialog} />
    );

    const actionButton = screen.getByRole('button', { name: /view details/i });
    await user.click(actionButton);

    expect(showErrorDialog).toHaveBeenCalledWith({
      error: ERROR,
      title: TITLE,
    });
  });

  it('should not render the "View details" button for ES|QL', () => {
    const ERROR = new Error('My error');
    const TITLE = 'Error title';

    renderErrorCallout(
      <ErrorCallout error={ERROR} isEsqlMode title={TITLE} showErrorDialog={jest.fn()} />
    );

    expect(screen.queryByRole('button', { name: /view details/i })).not.toBeInTheDocument();
  });

  it('should render the "ES|QL reference" button for ES|QL', () => {
    const ERROR = new Error('My error');
    const TITLE = 'Error title';
    const ESQL_HREF = 'https://example.test/esql-reference';

    renderErrorCallout(
      <ErrorCallout error={ERROR} isEsqlMode title={TITLE} esqlReferenceHref={ESQL_HREF} />
    );

    const link = screen.getByRole('link', { name: /open es\|ql reference/i });
    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', ESQL_HREF);
  });
});
