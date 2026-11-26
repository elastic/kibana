/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { MouseEvent } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { PanelMessage } from './panel_message';
import type { PanelMessageProps } from './panel_message';

const renderPanelMessage = (props: Partial<PanelMessageProps> = {}) =>
  render(
    <I18nProvider>
      <EuiThemeProvider>
        <PanelMessage
          severity="warning"
          title="Data view not found"
          body="Kibana couldn't find logs-*. Edit the panel to use another data view."
          {...props}
        />
      </EuiThemeProvider>
    </I18nProvider>
  );

describe('PanelMessage', () => {
  it('renders the title and body', () => {
    renderPanelMessage();

    expect(screen.getByTestId('panelMessage-title')).toHaveTextContent('Data view not found');
    expect(screen.getByTestId('panelMessage-body')).toHaveTextContent(
      "Kibana couldn't find logs-*. Edit the panel to use another data view."
    );
  });

  it.each([
    ['error', 'error', 'danger', 'Error'],
    ['warning', 'warning', 'warning', 'Warning'],
    ['info', 'info', 'primary', 'Information'],
  ] as const)(
    'renders the %s severity with a labelled %s icon',
    (severity, iconType, iconColor, iconLabel) => {
      renderPanelMessage({ severity });

      expect(screen.getByTestId('panelMessage')).toHaveAttribute('data-severity', severity);
      const icon = screen.getByTestId('panelMessage-icon');
      expect(icon).toHaveAttribute('data-euiicon-type', iconType);
      expect(icon).toHaveAttribute('color', iconColor);
      // The EUI jest mock for EuiIcon renders its aria-label as text.
      expect(icon).toHaveTextContent(iconLabel);
      expect(icon).not.toHaveAttribute('aria-hidden');
    }
  );

  it('renders a custom icon instead of the severity icon', () => {
    renderPanelMessage({ severity: 'info', icon: <span data-test-subj="customIcon" /> });

    expect(screen.getByTestId('customIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('panelMessage-icon')).not.toBeInTheDocument();
  });

  it('renders the primary action as a button and calls its handler', async () => {
    const onClick = jest.fn();
    renderPanelMessage({ primaryAction: { label: 'Edit visualization', onClick } });

    const button = screen.getByRole('button', { name: 'Edit visualization' });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render a button without a primary action', () => {
    renderPanelMessage();

    expect(screen.queryByTestId('panelMessage-primaryAction')).not.toBeInTheDocument();
  });

  it('renders secondary actions and View details as links at the end of the body', async () => {
    const onEditSettings = jest.fn();
    const onViewDetails = jest.fn();
    renderPanelMessage({
      secondaryActions: [
        { label: 'Edit settings', onClick: onEditSettings, 'data-test-subj': 'editSettingsLink' },
      ],
      onViewDetails,
    });

    expect(screen.getByTestId('panelMessage-body')).toHaveTextContent(
      "Kibana couldn't find logs-*. Edit the panel to use another data view. Edit settings. View details."
    );

    await userEvent.click(screen.getByTestId('editSettingsLink'));
    await userEvent.click(screen.getByTestId('panelMessage-viewDetails'));

    expect(onEditSettings).toHaveBeenCalledTimes(1);
    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });

  it('renders secondary actions that share a label', () => {
    renderPanelMessage({
      secondaryActions: [
        { label: 'Learn more', onClick: jest.fn(), href: '/docs/a' },
        { label: 'Learn more', onClick: jest.fn(), href: '/docs/b' },
      ],
    });

    expect(
      screen.getAllByRole('link', { name: 'Learn more' }).map((link) => link.getAttribute('href'))
    ).toEqual(['/docs/a', '/docs/b']);
  });

  it('renders actions with an href as navigable links', () => {
    renderPanelMessage({
      primaryAction: { label: 'Create data view', onClick: jest.fn(), href: '/app/dataViews' },
      secondaryActions: [{ label: 'Edit settings', onClick: jest.fn(), href: '/app/settings' }],
    });

    expect(screen.getByRole('link', { name: 'Create data view' })).toHaveAttribute(
      'href',
      '/app/dataViews'
    );
    expect(screen.getByRole('link', { name: 'Edit settings' })).toHaveAttribute(
      'href',
      '/app/settings'
    );
  });

  it('passes the click event to actions so they can stop the browser from following the href', () => {
    const navigateWithoutReload = jest.fn((event: MouseEvent<HTMLElement>) =>
      event.preventDefault()
    );
    renderPanelMessage({
      primaryAction: {
        label: 'Create data view',
        onClick: navigateWithoutReload,
        href: '/app/dataViews',
      },
      secondaryActions: [
        { label: 'Edit settings', onClick: navigateWithoutReload, href: '/app/settings' },
      ],
    });

    // fireEvent returns false when a handler prevented the default action.
    expect(fireEvent.click(screen.getByRole('link', { name: 'Create data view' }))).toBe(false);
    expect(fireEvent.click(screen.getByRole('link', { name: 'Edit settings' }))).toBe(false);
    expect(navigateWithoutReload).toHaveBeenCalledTimes(2);
  });

  it('does not render View details when no handler is passed', () => {
    renderPanelMessage();

    expect(screen.queryByTestId('panelMessage-viewDetails')).not.toBeInTheDocument();
  });
});
