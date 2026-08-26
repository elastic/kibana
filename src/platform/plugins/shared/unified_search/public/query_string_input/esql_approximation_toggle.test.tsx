/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { EsqlApproximationToggle } from './esql_approximation_toggle';

const startMock = coreMock.createStart();

const licensingStart = licensingMock.createStart();
licensingStart.getLicense.mockResolvedValue(licensingMock.createLicenseMock());

const mockServices = {
  ...startMock,
  docLinks: {
    links: {
      query: {
        queryESQLApproximateResults: 'https://elastic.co/docs/esql-kibana',
      },
    },
  },
  licensing: licensingStart,
};

const renderToggle = (props: React.ComponentProps<typeof EsqlApproximationToggle>) =>
  render(
    <EuiThemeProvider>
      <I18nProvider>
        <KibanaContextProvider services={mockServices}>
          <EsqlApproximationToggle {...props} />
        </KibanaContextProvider>
      </I18nProvider>
    </EuiThemeProvider>
  );

describe('EsqlApproximationToggle', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the bolt button with OFF aria-label when isApproximate is false', () => {
    renderToggle({ isApproximate: false, onChange });
    expect(screen.getByLabelText('Fast mode: OFF')).toBeInTheDocument();
  });

  it('renders the bolt button with ON aria-label when isApproximate is true', () => {
    renderToggle({ isApproximate: true, onChange });
    expect(screen.getByLabelText('Fast mode: ON')).toBeInTheDocument();
  });

  it('opens the popover with switch and description on button click', async () => {
    renderToggle({ isApproximate: false, onChange });
    await userEvent.click(screen.getByTestId('esqlApproximationToggleButton'));
    await waitFor(() => {
      expect(screen.getByTestId('esqlApproximationToggleSwitch')).toBeInTheDocument();
      expect(screen.getByText(/Get faster results/)).toBeInTheDocument();
    });
  });

  it('calls onChange when the switch is toggled', async () => {
    renderToggle({ isApproximate: false, onChange });
    await userEvent.click(screen.getByTestId('esqlApproximationToggleButton'));
    await waitFor(() => screen.getByRole('switch'));
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders additionalText inside the popover when provided', async () => {
    renderToggle({ isApproximate: false, onChange, additionalText: 'Index has 10M+ docs' });
    await userEvent.click(screen.getByTestId('esqlApproximationToggleButton'));
    await waitFor(() => expect(screen.getByText('Index has 10M+ docs')).toBeInTheDocument());
  });

  describe('invalid license state', () => {
    beforeEach(() => {
      const nonEnterpriseLicense = licensingMock.createLicenseMock();
      nonEnterpriseLicense.hasAtLeast.mockReturnValue(false);
      licensingStart.getLicense.mockResolvedValueOnce(nonEnterpriseLicense);
    });

    it('disables the toggle when license is not enterprise', async () => {
      renderToggle({ isApproximate: false, onChange });
      await waitFor(() => {
        expect(screen.getByTestId('esqlApproximationToggleButton')).toBeDisabled();
      });
    });

    it('shows unavailable aria-label when license is not enterprise', async () => {
      renderToggle({ isApproximate: false, onChange });
      await waitFor(() => {
        expect(screen.getByLabelText('Fast mode unavailable')).toBeInTheDocument();
      });
    });
  });

  describe('disabled state', () => {
    beforeEach(() => {
      renderToggle({ isApproximate: false, onChange, disabled: true });
    });

    it('renders the button as disabled', () => {
      expect(screen.getByTestId('esqlApproximationToggleButton')).toBeDisabled();
    });

    it('has unavailable aria-label', () => {
      expect(screen.getByLabelText('Fast mode unavailable')).toBeInTheDocument();
    });

    it('does not open the popover', async () => {
      await userEvent.click(screen.getByTestId('esqlApproximationToggleButton'), {
        pointerEventsCheck: 0,
      });
      expect(screen.queryByTestId('esqlApproximationToggleSwitch')).not.toBeInTheDocument();
    });
  });
});
