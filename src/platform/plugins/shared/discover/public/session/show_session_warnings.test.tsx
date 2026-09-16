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
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import type { DiscoverSessionWarning } from '../../server';
import { showSessionWarnings } from './show_session_warnings';

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: jest.fn(() => () => () => {}),
}));

const session = createDiscoverSessionMock({
  id: 'test-session',
  tabs: [
    { id: 'tab-2', label: 'Metrics' },
    { id: 'tab-1', label: 'Logs' },
  ].map((tab) => ({
    ...tab,
    sort: [],
    columns: [],
    grid: {},
    hideChart: false,
    hideTable: false,
    isTextBasedQuery: false,
    serializedSearchSource: {},
  })),
});

describe('showSessionWarnings', () => {
  it('opens warning details with the affected tab and control or property from Learn more', async () => {
    const core = coreMock.createStart();
    const modal = { close: jest.fn(), onClose: Promise.resolve() };
    core.overlays.openModal.mockReturnValue(modal);
    const warnings: DiscoverSessionWarning[] = [
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
      {
        type: 'dropped_panel',
        tab_id: 'missing-tab',
        panel_id: 'control-2',
        message: 'Unable to transform control panel [control-2]. Invalid value: <example>.',
      },
    ];

    showSessionWarnings({ session, warnings, core });

    expect(core.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
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

    const [toast] = core.notifications.toasts.addWarning.mock.calls[0];
    const actionProps = typeof toast === 'string' ? undefined : toast.actionProps;

    renderWithI18n(<EuiToast actionProps={actionProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'Learn more' }));

    expect(core.overlays.openModal).toHaveBeenCalledTimes(1);

    const mountPointMock = jest.mocked(toMountPoint);

    renderWithI18n(<>{mountPointMock.mock.calls[0][0]}</>);
    const dialog = screen.getByRole('dialog', { name: 'Warning details' });

    const titles = within(dialog).getAllByRole('term');
    expect(titles.map((title) => title.textContent)).toEqual([
      'Tab "Logs": control "control-1"',
      'Tab "Metrics": property "some_future_property"',
      'Tab "missing-tab": control "control-2"',
    ]);

    const descriptions = within(dialog).getAllByRole('definition');
    expect(descriptions).toHaveLength(3);
    expect(descriptions[0]).toHaveTextContent(warnings[0].message);
    expect(descriptions[1]).toHaveTextContent(warnings[1].message);
    expect(descriptions[2]).toHaveTextContent(warnings[2].message);

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(modal.close).toHaveBeenCalledTimes(1);
  });
});
