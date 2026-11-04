/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType } from 'react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CopyToDashboardParentApi } from './copy_to_dashboard_action';
import { CopyToDashboardModal } from './copy_to_dashboard_modal';
import { coreServices } from '../services/kibana_services';
import type { DashboardPickerProps } from '@kbn/presentation-util-plugin/public/components/dashboard_picker/dashboard_picker';

jest.mock('../utils/get_dashboard_capabilities', () => ({
  getDashboardCapabilities: () => ({
    createNew: true,
    showWriteControls: true,
  }),
}));

jest.mock('@kbn/presentation-util-plugin/public', () => ({
  withSuspense: (Component: ComponentType) => Component,
  LazyDashboardPicker: ({ idsToOmit, onChange }: DashboardPickerProps) => {
    const label = idsToOmit?.length
      ? `mockDashboardPicker idsToOmit:${idsToOmit.join(',')}`
      : `mockDashboardPicker`;
    return (
      <button
        id="mockDashboardPicker"
        onClick={() => onChange({ name: 'Dashboard Two', id: 'dashboardTwo' })}
      >
        {label}
      </button>
    );
  },
}));

describe('CopyToDashboardModal', () => {
  const panels: Record<string, ReturnType<CopyToDashboardParentApi['getDashboardPanelFromId']>> = {
    panelOne: {
      type: 'testPanelType',
      grid: { w: 1, h: 1, x: 0, y: 0 },
      serializedState: {
        title: 'Panel One',
      },
    },
    panelTwo: {
      type: 'otherPanelType',
      grid: { w: 2, h: 3, x: 1, y: 0 },
      serializedState: {
        title: 'Panel Two',
      },
    },
  };
  const parentApi: CopyToDashboardParentApi = {
    type: 'dashboard',
    savedObjectId$: new BehaviorSubject<string | undefined>('dashboardOne'),
    getDashboardPanelFromId: (id: string) => panels[id],
  };
  const panelIds = ['panelOne'];
  const closeModalMock = jest.fn();
  const navigateToWithEmbeddablePackagesMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../services/kibana_services').embeddableService = {
      getStateTransfer: () => ({
        navigateToWithEmbeddablePackages: navigateToWithEmbeddablePackagesMock,
      }),
    };
  });

  describe('"New dashboard" option', () => {
    test('should be enabled when parent is saved dashboard', async () => {
      const result = render(
        <CopyToDashboardModal
          parentApi={parentApi}
          panelIds={panelIds}
          closeModal={closeModalMock}
        />
      );

      await waitFor(() =>
        expect(result.container.querySelector('#new-dashboard-option')).toBeEnabled()
      );
    });

    test('should be disabled when parent is new dashboard', async () => {
      const newDashboardParentApi = {
        ...parentApi,
        savedObjectId$: new BehaviorSubject<string | undefined>(undefined),
      };
      const result = render(
        <CopyToDashboardModal
          parentApi={newDashboardParentApi}
          panelIds={panelIds}
          closeModal={closeModalMock}
        />
      );

      await waitFor(() =>
        expect(result.container.querySelector('#new-dashboard-option')).toBeDisabled()
      );
    });

    test('should navigate to new dashboard on submit', async () => {
      const result = render(
        <CopyToDashboardModal
          parentApi={parentApi}
          panelIds={panelIds}
          closeModal={closeModalMock}
        />
      );

      await waitFor(() => {
        // select new dashboard radio
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
        expect(navigateToWithEmbeddablePackagesMock).toHaveBeenCalledWith('dashboards', {
          path: '#/create',
          state: [
            {
              serializedState: {
                title: 'Panel One',
              },
              size: {
                height: 1,
                width: 1,
              },
              type: 'testPanelType',
            },
          ],
        })
      );
    });
  });

  describe('"Existing dashboard" option', () => {
    test('does not show the current dashboard in the dashboard picker', async () => {
      render(
        <CopyToDashboardModal
          parentApi={parentApi}
          panelIds={panelIds}
          closeModal={closeModalMock}
        />
      );

      await waitFor(() =>
        expect(screen.queryByText('mockDashboardPicker idsToOmit:dashboardOne')).toBeInTheDocument()
      );
    });

    test('should navigate to selected dashboard on submit', async () => {
      const result = render(
        <CopyToDashboardModal
          parentApi={parentApi}
          panelIds={panelIds}
          closeModal={closeModalMock}
        />
      );

      await waitFor(() => {
        // select a dashboard
        const mockDashboardPickerButton = result.container.querySelector('#mockDashboardPicker');
        expect(mockDashboardPickerButton).not.toBeNull();
        userEvent.click(mockDashboardPickerButton!);

        // Click submit button
        const submitButton = result.container.querySelector('[data-test-subj=confirmCopyToButton]');
        expect(submitButton).not.toBeNull();
        expect(submitButton).toBeEnabled();
        userEvent.click(submitButton!);
      });

      await waitFor(() =>
        expect(navigateToWithEmbeddablePackagesMock).toHaveBeenCalledWith('dashboards', {
          path: '#/view/dashboardTwo?_a=(viewMode:edit)',
          state: [
            {
              serializedState: {
                title: 'Panel One',
              },
              size: {
                height: 1,
                width: 1,
              },
              type: 'testPanelType',
            },
          ],
        })
      );
    });
  });

  describe('multiple panels', () => {
    test('should copy all panels in a single navigation', async () => {
      const result = render(
        <CopyToDashboardModal
          parentApi={parentApi}
          panelIds={['panelOne', 'panelTwo']}
          closeModal={closeModalMock}
        />
      );

      await waitFor(() => {
        const newDashboardRadio = result.container.querySelector('#new-dashboard-option');
        expect(newDashboardRadio).not.toBeNull();
        userEvent.click(newDashboardRadio!);

        const submitButton = result.container.querySelector('[data-test-subj=confirmCopyToButton]');
        expect(submitButton).not.toBeNull();
        userEvent.click(submitButton!);
      });

      await waitFor(() =>
        expect(navigateToWithEmbeddablePackagesMock).toHaveBeenCalledWith('dashboards', {
          path: '#/create',
          state: [
            {
              serializedState: { title: 'Panel One' },
              size: { height: 1, width: 1 },
              type: 'testPanelType',
            },
            {
              serializedState: { title: 'Panel Two' },
              size: { height: 3, width: 2 },
              type: 'otherPanelType',
            },
          ],
        })
      );
    });

    test('should not navigate when one of the panels cannot be found', async () => {
      const result = render(
        <CopyToDashboardModal
          parentApi={{
            ...parentApi,
            getDashboardPanelFromId: (id: string) => {
              if (id === 'missingPanel') throw new Error('not found');
              return panels[id];
            },
          }}
          panelIds={['panelOne', 'missingPanel']}
          closeModal={closeModalMock}
        />
      );

      await waitFor(() => {
        const newDashboardRadio = result.container.querySelector('#new-dashboard-option');
        expect(newDashboardRadio).not.toBeNull();
        userEvent.click(newDashboardRadio!);

        const submitButton = result.container.querySelector('[data-test-subj=confirmCopyToButton]');
        expect(submitButton).not.toBeNull();
        userEvent.click(submitButton!);
      });

      await waitFor(() => expect(closeModalMock).toHaveBeenCalled());
      expect(navigateToWithEmbeddablePackagesMock).not.toHaveBeenCalled();
      expect(coreServices.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Unable to copy panel, no panel with id missingPanel found',
        'data-test-subj': 'copyToDashboardPanelNotFound',
      });
    });
  });
});
