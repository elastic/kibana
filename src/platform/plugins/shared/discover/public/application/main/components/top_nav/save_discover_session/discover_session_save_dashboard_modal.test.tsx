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
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { setStubKibanaServices } from '@kbn/presentation-util-plugin/public/services/mocks';
import type { DiscoverSessionSaveDashboardModalProps } from './discover_session_save_dashboard_modal';
import { DiscoverSessionSaveDashboardModal } from './discover_session_save_dashboard_modal';

const renderSaveModal = (
  overrides: Partial<DiscoverSessionSaveDashboardModalProps> = {}
): {
  onClose: jest.MockedFunction<() => void>;
  onCopyOnSaveChange: jest.MockedFunction<(newCopyOnSave: boolean) => void>;
  onSave: jest.MockedFunction<DiscoverSessionSaveDashboardModalProps['onSave']>;
} => {
  const onClose = jest.fn();
  const onCopyOnSaveChange = jest.fn();
  const onSave: jest.MockedFunction<DiscoverSessionSaveDashboardModalProps['onSave']> = jest
    .fn()
    .mockResolvedValue(undefined);

  render(
    <EuiProvider>
      <I18nProvider>
        <DiscoverSessionSaveDashboardModal
          hideDashboardOptions={true}
          initialTags={[]}
          initialTimeRestore={false}
          isTimeBased={true}
          onClose={onClose}
          onCopyOnSaveChange={onCopyOnSaveChange}
          onSave={onSave}
          sessionId="saved-session-id"
          title="My session"
          {...overrides}
        />
      </I18nProvider>
    </EuiProvider>
  );

  return {
    onClose,
    onCopyOnSaveChange,
    onSave,
  };
};

describe('DiscoverSessionSaveDashboardModal', () => {
  beforeAll(() => {
    setStubKibanaServices();
  });

  it('passes modal state to onSave', async () => {
    const { onSave } = renderSaveModal();

    await screen.findByTestId('savedObjectSaveModal');

    await userEvent.click(screen.getByTestId('storeTimeWithSearch'));
    await userEvent.click(screen.getByTestId('confirmSaveSavedObjectButton'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        addToLibrary: true,
        dashboardId: null,
        newTags: [],
        newTimeRestore: true,
        newTitle: 'My session',
      })
    );
  });

  it('forwards copy-on-save toggle changes', async () => {
    const { onCopyOnSaveChange } = renderSaveModal({ isTimeBased: false });

    await screen.findByTestId('saveAsNewCheckbox');
    await userEvent.click(screen.getByTestId('saveAsNewCheckbox'));

    expect(onCopyOnSaveChange).toHaveBeenCalledWith(true);
  });

  it('hides add-to-library checkbox but keeps destination options', async () => {
    renderSaveModal({ hideDashboardOptions: false, isTimeBased: false });

    await screen.findByTestId('add-to-dashboard-options');

    expect(screen.queryByTestId('add-to-library-checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'None' })).toBeInTheDocument();
  });

  it('always saves by reference even when saving to dashboard', async () => {
    const { onSave } = renderSaveModal({ hideDashboardOptions: false, isTimeBased: false });

    await screen.findByTestId('saveAsNewCheckbox');
    await userEvent.click(screen.getByTestId('saveAsNewCheckbox'));
    await userEvent.click(screen.getByRole('radio', { name: 'New' }));
    await userEvent.click(screen.getByTestId('confirmSaveSavedObjectButton'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        addToLibrary: true,
        dashboardId: 'new',
      })
    );
  });
});
