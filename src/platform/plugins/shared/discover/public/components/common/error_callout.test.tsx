/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';
import { discoverServiceMock } from '../../__mocks__/services';
import { ErrorCallout } from './error_callout';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';

const mockRenderSearchError = jest.fn();

jest.mock('@kbn/search-errors', () => {
  const originalModule = jest.requireActual('@kbn/search-errors');
  return {
    ...originalModule,
    renderSearchError: () => mockRenderSearchError(),
  };
});

describe('ErrorCallout', () => {
  const renderWithServices = (component: React.ReactNode) =>
    render(<DiscoverTestProvider services={discoverServiceMock}>{component}</DiscoverTestProvider>);

  afterEach(() => {
    mockRenderSearchError.mockReset();
  });

  it('should render', () => {
    const title = 'Error title';
    const error = new Error('My error');
    renderWithServices(<ErrorCallout title={title} error={error} />);

    // Verify title is present
    expect(screen.getByTestId('discoverErrorCalloutTitle')).toBeInTheDocument();
    expect(screen.getByTestId('discoverErrorCalloutTitle')).toHaveTextContent(title);

    // Verify error message is shown
    expect(screen.getByText(error.message)).toBeInTheDocument();

    // Verify code block exists
    expect(screen.getByRole('code')).toBeInTheDocument();

    // Verify button exists
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render with override display', () => {
    const title = 'Override title';
    const error = new Error('My error');
    const overrideDisplay = <div data-testid="overrideDisplay">Override display</div>;
    mockRenderSearchError.mockReturnValue({ title, body: overrideDisplay });
    renderWithServices(<ErrorCallout title="Original title" error={error} />);

    // Verify title is overridden
    expect(screen.getByTestId('discoverErrorCalloutTitle')).toHaveTextContent(title);

    // Verify override display is shown
    expect(screen.getByTestId('overrideDisplay')).toBeInTheDocument();
    expect(screen.getByText('Override display')).toBeInTheDocument();

    // Button should not be present
    expect(screen.queryByTestId('discoverErrorCalloutShowDetailsButton')).not.toBeInTheDocument();
  });

  it('should call showErrorDialog when the button is clicked', async () => {
    const user = userEvent.setup();
    (discoverServiceMock.core.notifications.showErrorDialog as jest.Mock).mockClear();
    const title = 'Error title';
    const error = new Error('My error');
    renderWithServices(<ErrorCallout title={title} error={error} />);

    // Click the button
    await user.click(screen.getByRole('button'));

    // Verify showErrorDialog was called with correct args
    expect(discoverServiceMock.core.notifications.showErrorDialog).toHaveBeenCalledWith({
      title,
      error,
    });
  });

  it('should not render the "View details" button for ES|QL', () => {
    (discoverServiceMock.core.notifications.showErrorDialog as jest.Mock).mockClear();
    const title = 'Error title';
    const error = new Error('My error');
    renderWithServices(<ErrorCallout title={title} error={error} isEsqlMode />);

    // Verify details button is not shown
    expect(screen.queryByTestId('discoverErrorCalloutShowDetailsButton')).not.toBeInTheDocument();
  });

  it('should render the "ES|QL reference" button for ES|QL', () => {
    (discoverServiceMock.core.notifications.showErrorDialog as jest.Mock).mockClear();
    const title = 'Error title';
    const error = new Error('My error');
    renderWithServices(<ErrorCallout title={title} error={error} isEsqlMode />);

    // Verify ESQL reference button is shown
    expect(screen.getByTestId('discoverErrorCalloutESQLReferenceButton')).toBeInTheDocument();
  });
});
