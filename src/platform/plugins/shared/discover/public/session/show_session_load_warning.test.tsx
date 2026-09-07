/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { showSessionLoadWarning } from './show_session_load_warning';

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: jest.fn(() => () => () => {}),
}));

describe('showSessionLoadWarning', () => {
  it('opens the server warning details from Learn more without assuming all warnings are controls', async () => {
    const core = coreMock.createStart();
    const modal = { close: jest.fn(), onClose: Promise.resolve() };
    core.overlays.openModal.mockReturnValue(modal);
    const warnings: Parameters<typeof showSessionLoadWarning>[0]['warnings'] = [
      {
        type: 'dropped_panel',
        tab_id: 'tab-1',
        panel_id: 'control-1',
        message: 'Unable to transform control panel [control-1].',
      },
      {
        type: 'dropped_property',
        tab_id: 'tab-2',
        key: 'some_future_property',
        message: 'This stored property could not be loaded.',
      },
    ];

    showSessionLoadWarning({ warnings, core });

    expect(core.notifications.toasts.addWarning).toHaveBeenCalledWith({
      title: 'Some session content could not be loaded',
      text: expect.any(Function),
      'data-test-subj': 'discoverSessionLoadWarning',
    });
    expect(core.overlays.openModal).not.toHaveBeenCalled();

    // Render the content passed to Core's mount points, as the toast and overlay services would.
    const mountPointMock = jest.mocked(toMountPoint);
    renderWithI18n(<>{mountPointMock.mock.calls[0][0]}</>);
    expect(
      screen.getByText(
        '2 parts of this session were omitted. Saving this session will keep only the content currently shown.'
      )
    ).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Learn more' }));

    expect(core.overlays.openModal).toHaveBeenCalledTimes(1);
    renderWithI18n(<>{mountPointMock.mock.calls[1][0]}</>);
    const dialog = screen.getByRole('dialog', { name: 'Warning details' });
    expect(dialog).toHaveTextContent(warnings[0].message);
    expect(dialog).toHaveTextContent(warnings[1].message);
    expect(dialog).toHaveTextContent('some_future_property');
    expect(dialog).toHaveTextContent('tab-2');

    await userEvent.click(screen.getByRole('button', { name: 'Close', exact: true }));
    expect(modal.close).toHaveBeenCalledTimes(1);
  });
});
