/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DashboardSaveModal } from './save_modal';

jest.mock('@kbn/content-management-access-control-public', () => ({
  AccessModeContainer: () => null,
}));

jest.mock('@kbn/saved-objects-plugin/public', () => ({
  SavedObjectSaveModal: () => null,
  SavedObjectSaveModalWithSaveResult: ({
    options,
  }: {
    children: React.ReactNode;
    options: React.ReactNode;
  }) => (
    <div data-test-subj="save-modal">
      <div data-test-subj="save-modal-options">{options}</div>
    </div>
  ),
}));

jest.mock('../../services/kibana_services', () => ({
  coreServices: {
    userProfile: {
      getCurrent: jest.fn(),
    },
  },
  savedObjectsTaggingService: undefined,
  spacesService: {
    getActiveSpace: jest.fn().mockResolvedValue({
      id: 'default',
      name: 'Default',
      disabledFeatures: [],
    }),
  },
}));

jest.mock('../../services/access_control_service', () => ({
  getAccessControlClient: jest.fn().mockReturnValue({
    isInEditAccessMode: jest.fn().mockReturnValue(false),
    getCapabilities: jest.fn().mockResolvedValue({
      capabilities: {
        createAccessMode: true,
        createReadOnlyAccessMode: true,
      },
    }),
  }),
}));

const mockSave = jest.fn();
const mockClose = jest.fn();

const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

const renderDashboardSaveModal = (
  props: Partial<React.ComponentProps<typeof DashboardSaveModal>> = {}
) => {
  return renderWithI18n(
    <DashboardSaveModal
      onSave={mockSave}
      onClose={mockClose}
      title="dash title"
      description="dash description"
      timeRestore={false}
      projectRoutingRestore={false}
      showCopyOnSave={false}
      {...props}
    />
  );
};

describe('DashboardSaveModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders save modal', () => {
    renderDashboardSaveModal({ timeRestore: true, showCopyOnSave: true });

    expect(screen.getByTestId('save-modal')).toBeInTheDocument();
  });

  test('renders time restore switch when showStoreTimeOnSave is true by default', () => {
    renderDashboardSaveModal({ timeRestore: true, showCopyOnSave: true });

    const timeSwitch = screen.getByTestId('storeTimeWithDashboard');
    expect(timeSwitch).toBeInTheDocument();
    expect(timeSwitch).toBeChecked();
  });

  test('renders time restore switch as unchecked when timeRestore is false', () => {
    renderDashboardSaveModal();

    const timeSwitch = screen.getByTestId('storeTimeWithDashboard');
    expect(timeSwitch).toBeInTheDocument();
    expect(timeSwitch).not.toBeChecked();
  });

  describe('projectRoutingRestore prop', () => {
    test('renders project routing switch as checked when projectRoutingRestore is true', () => {
      renderDashboardSaveModal({
        projectRoutingRestore: true,
        showStoreProjectRoutingOnSave: true,
      });

      const projectRoutingSwitch = screen.getByTestId('storeProjectRoutingWithDashboard');
      expect(projectRoutingSwitch).toBeChecked();
    });

    test('renders project routing switch as unchecked when projectRoutingRestore is false', () => {
      renderDashboardSaveModal({ showStoreProjectRoutingOnSave: true });

      const projectRoutingSwitch = screen.getByTestId('storeProjectRoutingWithDashboard');
      expect(projectRoutingSwitch).toBeInTheDocument();
      expect(projectRoutingSwitch).not.toBeChecked();
    });

    test.each([
      { showStoreProjectRoutingOnSave: false, expectedCount: 0 },
      { showStoreProjectRoutingOnSave: true, expectedCount: 1 },
    ])(
      'renders $expectedCount project routing switch when showStoreProjectRoutingOnSave is $showStoreProjectRoutingOnSave',
      ({ showStoreProjectRoutingOnSave, expectedCount }) => {
        renderDashboardSaveModal({ showStoreProjectRoutingOnSave });

        expect(screen.getByTestId('save-modal')).toBeInTheDocument();
        const switches = screen.queryAllByTestId('storeProjectRoutingWithDashboard');
        expect(switches).toHaveLength(expectedCount);
      }
    );
  });
});
