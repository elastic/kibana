/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { FailedStepErrorPanel } from './failed_step_error_panel';

const renderPanel = (props: Partial<React.ComponentProps<typeof FailedStepErrorPanel>> = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <FailedStepErrorPanel
          error="Boom"
          onViewInput={jest.fn()}
          ariaLabel="Error details for my_step"
          {...props}
        />
      </I18nProvider>
    </EuiProvider>
  );

describe('FailedStepErrorPanel', () => {
  it('renders message-first with no visible heading and exposes the region label', () => {
    renderPanel();
    const region = screen.getByRole('region', { name: 'Error details for my_step' });
    expect(region).toBeInTheDocument();
    expect(screen.getByTestId('workflowFailedStepErrorMessage')).toHaveTextContent('Boom');
    expect(screen.queryByText('Why this step failed')).not.toBeInTheDocument();
  });

  it('renders outlined View input and empty Copy error buttons', async () => {
    const onViewInput = jest.fn();
    renderPanel({ onViewInput });
    const viewBtn = screen.getByTestId('workflowFailedStepViewInput');
    expect(viewBtn).toHaveTextContent('View input');
    await userEvent.click(viewBtn);
    expect(onViewInput).toHaveBeenCalled();
    expect(screen.getByTestId('workflowFailedStepCopyError')).toHaveTextContent('Copy error');
  });

  it('uses View request for http steps', () => {
    renderPanel({ stepType: 'http' });
    expect(screen.getByTestId('workflowFailedStepViewInput')).toHaveTextContent('View request');
  });

  it('renders messageOverride when provided', () => {
    renderPanel({
      messageOverride: 'All 4 attempts failed. Last error: Boom',
    });
    expect(screen.getByTestId('workflowFailedStepErrorMessage')).toHaveTextContent(
      'All 4 attempts failed. Last error: Boom'
    );
  });
});
