/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiToast } from '@elastic/eui';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ToastInputFields } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { createDiscoverServicesMock } from '../__mocks__/services';
import type { DiscoverSessionPersistence } from './persistence';
import { loadDiscoverSession } from './load_discover_session';

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: jest.fn(() => () => () => {}),
}));

const session = createDiscoverSessionMock({ id: 'test-session' });

describe('loadDiscoverSession', () => {
  it('warns when some content was omitted and returns the session', async () => {
    const { core } = createDiscoverServicesMock();
    const persistence: jest.Mocked<DiscoverSessionPersistence> = {
      get: jest.fn().mockResolvedValue({
        session,
        warnings: [
          {
            type: 'dropped_property',
            tab_id: 'tab-1',
            key: 'control_panels',
            message: 'Unable to transform control panels.',
          },
        ],
      }),
      save: jest.fn(),
    };

    const result = await loadDiscoverSession({
      id: session.id,
      persistence,
      core,
    });

    expect(result).toBe(session);
    expect(core.notifications.toasts.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test-subj': 'discoverSessionLoadWarning',
      })
    );
  });

  it('does not warn when the session loads without warnings', async () => {
    const { core } = createDiscoverServicesMock();
    const persistence: jest.Mocked<DiscoverSessionPersistence> = {
      get: jest.fn().mockResolvedValue({ session, warnings: [] }),
      save: jest.fn(),
    };

    const result = await loadDiscoverSession({
      id: session.id,
      persistence,
      core,
    });

    expect(result).toBe(session);
    expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
  });

  it('opens the server warning details from Learn more without assuming all warnings are controls', async () => {
    const core = coreMock.createStart();
    const modal = { close: jest.fn(), onClose: Promise.resolve() };
    core.overlays.openModal.mockReturnValue(modal);
    const warnings: Awaited<ReturnType<DiscoverSessionPersistence['get']>>['warnings'] = [
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

    const persistence: jest.Mocked<DiscoverSessionPersistence> = {
      get: jest.fn().mockResolvedValue({ session, warnings }),
      save: jest.fn(),
    };

    const result = await loadDiscoverSession({ id: session.id, persistence, core });

    expect(result).toBe(session);

    expect(core.notifications.toasts.addWarning).toHaveBeenCalledWith({
      title: 'Some session content could not be loaded',
      actionProps: {
        primary: {
          children: 'Learn more',
          onClick: expect.any(Function),
        },
      },
      'data-test-subj': 'discoverSessionLoadWarning',
    });
    expect(core.overlays.openModal).not.toHaveBeenCalled();

    const { actionProps } = core.notifications.toasts.addWarning.mock.calls[0][0] as ToastInputFields;
    renderWithI18n(<EuiToast actionProps={actionProps} />);

    await userEvent.click(screen.getByRole('button', { name: 'Learn more' }));

    expect(core.overlays.openModal).toHaveBeenCalledTimes(1);
    const mountPointMock = jest.mocked(toMountPoint);
    renderWithI18n(<>{mountPointMock.mock.calls[0][0]}</>);
    const dialog = screen.getByRole('dialog', { name: 'Warning details' });
    expect(dialog).toHaveTextContent(warnings[0].message);
    expect(dialog).toHaveTextContent(warnings[1].message);
    expect(dialog).toHaveTextContent('some_future_property');
    expect(dialog).toHaveTextContent('tab-2');

    await userEvent.click(screen.getByRole('button', { name: 'Close', exact: true }));
    expect(modal.close).toHaveBeenCalledTimes(1);
  });
});
