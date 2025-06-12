/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentType } from 'react';
import { BehaviorSubject } from 'rxjs';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyToDashboardAPI } from './copy_to_dashboard_action';
import { CopyToDashboardModal } from './copy_to_dashboard_modal';

jest.mock('../utils/get_dashboard_capabilities', () => ({
  getDashboardCapabilities: () => ({
    createNew: true,
    showWriteControls: true,
  }),
}));

jest.mock('@kbn/presentation-util-plugin/public', () => ({
  withSuspense: (Component: ComponentType) => Component,
  LazyDashboardPicker: ({ idsToOmit }: { idsToOmit?: string[] }) => {
    return idsToOmit?.length ? (
      <div>mockDashboardPicker idsToOmit:{idsToOmit.join(',')}</div>
    ) : (
      <div>mockDashboardPicker</div>
    );
  },
}));

describe('CopyToDashboardModal', () => {
  const api: CopyToDashboardAPI = {
    type: 'testPanelType',
    uuid: 'panelOne',
    parentApi: {
      type: 'dashboard',
      savedObjectId$: new BehaviorSubject<string | undefined>('dashboardOne'),
      getDashboardPanelFromId: () => ({
        type: 'testPanelType',
        gridData: { w: 1, h: 1, x: 0, y: 0, i: 'panelOne' },
        serializedState: {
          rawState: {
            title: 'Panel One',
          },
        },
      }),
    },
  };
  const closeModalMock = jest.fn();
  const navigateToWithEmbeddablePackageMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../services/kibana_services').embeddableService = {
      getStateTransfer: () => ({
        navigateToWithEmbeddablePackage: navigateToWithEmbeddablePackageMock,
      }),
    };
  });

  test('should enable add to "new dashboard" when in saved dashboard', async () => {
    const result = render(<CopyToDashboardModal api={api} closeModal={closeModalMock} />);

    await waitFor(() =>
      expect(result.container.querySelector('#new-dashboard-option')).toBeEnabled()
    );
  });

  test('should disable add to "new dashboard" when in new dashboard', async () => {
    const newDashboardApi = {
      ...api,
      parentApi: {
        ...api.parentApi,
        savedObjectId$: new BehaviorSubject<string | undefined>(undefined),
      },
    };
    const result = render(
      <CopyToDashboardModal api={newDashboardApi} closeModal={closeModalMock} />
    );

    await waitFor(() =>
      expect(result.container.querySelector('#new-dashboard-option')).toBeDisabled()
    );
  });

  test('does not show the current dashboard in the dashboard picker', async () => {
    render(<CopyToDashboardModal api={api} closeModal={closeModalMock} />);

    await waitFor(() =>
      expect(screen.queryByText('mockDashboardPicker idsToOmit:dashboardOne')).toBeInTheDocument()
    );
  });

  test('should navigate to dashboard on submit', async () => {
    const result = render(<CopyToDashboardModal api={api} closeModal={closeModalMock} />);

    await waitFor(() => {
      // select new dashboard radio to enable submit button
      const newDashboardRadio = result.container.querySelector('#new-dashboard-option');
      expect(newDashboardRadio).not.toBeNull();
      userEvent.click(newDashboardRadio!);

      // Click submit button
      const submitButton = result.container.querySelector('[data-test-subj=confirmCopyToButton]');
      expect(submitButton).not.toBeNull();
      expect(submitButton).toBeEnabled();
      userEvent.click(submitButton!);
    });

    await waitFor(() =>
      expect(navigateToWithEmbeddablePackageMock).toHaveBeenCalledWith('dashboards', {
        path: '#/create',
        state: {
          serializedState: {
            rawState: {
              title: 'Panel One',
            },
          },
          size: {
            height: 1,
            width: 1,
          },
          type: 'testPanelType',
        },
      })
    );
  });
});
