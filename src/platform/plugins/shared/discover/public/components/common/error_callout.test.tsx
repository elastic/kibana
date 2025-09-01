/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { discoverServiceMock } from '../../__mocks__/services';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import { ErrorCallout } from './error_callout';
import { render, screen } from '@testing-library/react';

const mockRenderSearchError = jest.fn();

jest.mock('@kbn/search-errors', () => {
  const originalModule = jest.requireActual('@kbn/search-errors');

  return {
    ...originalModule,
    renderSearchError: () => mockRenderSearchError(),
  };
});

const renderWithServices = (ui: React.ReactElement) =>
  render(<DiscoverTestProvider services={discoverServiceMock}>{ui}</DiscoverTestProvider>);

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

    renderWithServices(<ErrorCallout error={ERROR} title={TITLE} />);

    expect(screen.getByText(TITLE)).toBeVisible();
    expect(screen.getByText(ERROR.message)).toBeVisible();
    expect(screen.getByRole('button', { name: /view details/i })).toBeVisible();
  });

  it('should render with override display', () => {
    const ERROR = new Error('My error');
    const OVERWRITE_DISPLAY = <div data-test-subj="discoverErrorCalloutBody">Override display</div>;
    const OVERWRITE_TITLE = 'Override title';

    mockRenderSearchError.mockReturnValue({ body: OVERWRITE_DISPLAY, title: OVERWRITE_TITLE });
    renderWithServices(<ErrorCallout error={ERROR} title="Original title" />);

    expect(screen.getByText(OVERWRITE_TITLE)).toBeVisible();
    expect(screen.getByTestId('discoverErrorCalloutBody')).toBeVisible();
    expect(screen.queryByText(ERROR.message)).not.toBeInTheDocument();
    expect(screen.queryByTestId('discoverErrorCalloutShowDetailsButton')).not.toBeInTheDocument();
  });

  it('should call showErrorDialog when the button is clicked', async () => {
    const ERROR = new Error('My error');
    const TITLE = 'Error title';
    const user = userEvent.setup();

    renderWithServices(<ErrorCallout error={ERROR} title={TITLE} />);

    const actionButton = screen.getByRole('button', { name: /view details/i });
    await user.click(actionButton);

    expect(discoverServiceMock.core.notifications.showErrorDialog).toHaveBeenCalledWith({
      error: ERROR,
      title: TITLE,
    });
  });

  it('should not render the "View details" button for ES|QL', () => {
    const ERROR = new Error('My error');
    const TITLE = 'Error title';

    renderWithServices(<ErrorCallout error={ERROR} isEsqlMode title={TITLE} />);

    expect(screen.queryByRole('button', { name: /view details/i })).not.toBeInTheDocument();
  });

  it('should render the "ES|QL reference" button for ES|QL', () => {
    const ERROR = new Error('My error');
    const TITLE = 'Error title';

    renderWithServices(<ErrorCallout error={ERROR} isEsqlMode title={TITLE} />);

    expect(screen.getByRole('link', { name: /open es\|ql reference/i })).toBeVisible();
  });
});
