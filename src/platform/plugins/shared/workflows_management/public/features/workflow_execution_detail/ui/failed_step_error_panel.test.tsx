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

const getPrimaryAndSecondary = () => {
  const region = screen.getByTestId('workflowFailedStepErrorPanel');
  const buttons = region.querySelectorAll('button');
  expect(buttons.length).toBeGreaterThanOrEqual(2);
  return { primary: buttons[0], secondary: buttons[1] };
};

describe('FailedStepErrorPanel', () => {
  it('renders message-first with no visible heading and exposes the region label', () => {
    renderPanel();
    const region = screen.getByRole('region', { name: 'Error details for my_step' });
    expect(region).toBeInTheDocument();
    expect(screen.getByTestId('workflowFailedStepErrorMessage')).toHaveTextContent('Boom');
    expect(screen.queryByText('Why this step failed')).not.toBeInTheDocument();
  });

  it('state D: bordered View input + text Copy error, no AB strings', async () => {
    const onViewInput = jest.fn();
    const { container } = renderPanel({ onViewInput, diagnoseState: 'd' });
    const viewBtn = screen.getByTestId('workflowFailedStepViewInput');
    expect(viewBtn).toHaveTextContent('View input');
    await userEvent.click(viewBtn);
    expect(onViewInput).toHaveBeenCalled();
    expect(screen.getByTestId('workflowFailedStepCopyError')).toHaveTextContent('Copy error');
    expect(screen.queryByTestId('workflowFailedStepDiagnose')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Diagnose with AI/i);
    expect(screen.queryByTestId('workflowFailedStepDiagnoseLicenseTeaser')).not.toBeInTheDocument();
  });

  it('state A: Diagnose primary + View input secondary, no Copy error', async () => {
    const onDiagnose = jest.fn();
    const onViewInput = jest.fn();
    renderPanel({ diagnoseState: 'a', onDiagnose, onViewInput });

    const diagnose = screen.getByTestId('workflowFailedStepDiagnose');
    expect(diagnose).toHaveTextContent('Diagnose with AI');
    expect(diagnose).toHaveAttribute('aria-label', 'Diagnose with AI');
    await userEvent.click(diagnose);
    expect(onDiagnose).toHaveBeenCalled();

    expect(screen.getByTestId('workflowFailedStepViewInput')).toHaveTextContent('View input');
    expect(screen.queryByTestId('workflowFailedStepCopyError')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowFailedStepDiagnoseLicenseTeaser')).not.toBeInTheDocument();

    const { primary, secondary } = getPrimaryAndSecondary();
    expect(primary).toHaveAttribute('data-test-subj', 'workflowFailedStepDiagnose');
    expect(secondary).toHaveAttribute('data-test-subj', 'workflowFailedStepViewInput');
  });

  it('shows loading and disables Diagnose while handoff is in flight', () => {
    renderPanel({
      diagnoseState: 'a',
      onDiagnose: jest.fn(),
      onViewInput: jest.fn(),
      isDiagnoseLoading: true,
    });
    const diagnose = screen.getByTestId('workflowFailedStepDiagnose');
    expect(diagnose).toBeDisabled();
  });

  it('state B renders the same CTAs as state A', () => {
    const shared = { onDiagnose: jest.fn(), onViewInput: jest.fn() };
    renderPanel({ diagnoseState: 'a', ...shared });
    expect(screen.getByTestId('workflowFailedStepDiagnose')).toBeInTheDocument();
    expect(screen.getByTestId('workflowFailedStepViewInput')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowFailedStepCopyError')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowFailedStepDiagnoseLicenseTeaser')).not.toBeInTheDocument();
  });

  it('state B Diagnose click invokes onDiagnose (routes via AB setup when no LLM)', async () => {
    const onDiagnose = jest.fn();
    renderPanel({ diagnoseState: 'b', onDiagnose, onViewInput: jest.fn() });
    await userEvent.click(screen.getByTestId('workflowFailedStepDiagnose'));
    expect(onDiagnose).toHaveBeenCalled();
    expect(screen.queryByTestId('workflowFailedStepCopyError')).not.toBeInTheDocument();
  });
  it('state C: View input + Copy error + license teaser link, no gated button', async () => {
    const onOpenLicenseManagement = jest.fn();
    renderPanel({
      diagnoseState: 'c',
      requiredLicenseTier: 'enterprise',
      licenseManagementHref: '/app/management/license_management',
      onOpenLicenseManagement,
    });

    expect(screen.getByTestId('workflowFailedStepViewInput')).toHaveTextContent('View input');
    expect(screen.getByTestId('workflowFailedStepCopyError')).toHaveTextContent('Copy error');
    expect(screen.queryByTestId('workflowFailedStepDiagnose')).not.toBeInTheDocument();

    const teaser = screen.getByTestId('workflowFailedStepDiagnoseLicenseTeaser');
    expect(teaser).toHaveTextContent(/Diagnose with AI/);
    expect(teaser).toHaveTextContent(/requires enterprise license/);

    const link = screen.getByTestId('workflowFailedStepDiagnoseLicenseLink');
    await userEvent.click(link);
    expect(onOpenLicenseManagement).toHaveBeenCalled();
  });

  it('uses View request for http steps', () => {
    renderPanel({ stepType: 'http', diagnoseState: 'd' });
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
