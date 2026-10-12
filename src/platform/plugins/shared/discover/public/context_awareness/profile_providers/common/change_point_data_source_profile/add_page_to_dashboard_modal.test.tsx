/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ESQLVariableType } from '@kbn/esql-types';
import type { LensXYConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { AddPageToDashboardModal } from './add_page_to_dashboard_modal';

jest.mock('@kbn/lens-embeddable-utils/config_builder', () => ({
  LensConfigBuilder: jest.fn(),
}));

jest.mock('@kbn/presentation-util-plugin/public', () => ({
  withSuspense: (Component: React.ComponentType) => Component,
  LazyDashboardPicker: ({
    onChange,
  }: {
    onChange: (dashboard: { id: string; name: string }) => void;
  }) => (
    <button
      type="button"
      data-test-subj="mockDashboardPicker"
      onClick={() => onChange({ id: 'dash-1', name: 'Operations' })}
    >
      pick
    </button>
  ),
}));

const chart = {
  config: {
    chartType: 'xy',
    title: 'host-1',
    dataset: { esql: 'FROM logs' },
    layers: [],
  } as LensXYConfig,
  description: 'host: host-1',
};

const navigateToWithEmbeddablePackages = jest.fn();
const addDanger = jest.fn();

const renderModal = (canEditExisting = true) =>
  render(
    <I18nProvider>
      <AddPageToDashboardModal
        charts={[chart]}
        esqlVariables={[{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }]}
        canCreateNew
        canEditExisting={canEditExisting}
        dataViews={{} as never}
        embeddable={
          {
            getStateTransfer: () => ({ navigateToWithEmbeddablePackages }),
          } as never
        }
        notifications={{ toasts: { addDanger } } as never}
        onClose={jest.fn()}
      />
    </I18nProvider>
  );

describe('AddPageToDashboardModal', () => {
  beforeEach(() => {
    navigateToWithEmbeddablePackages.mockReset();
    addDanger.mockReset();
    (LensConfigBuilder as jest.Mock).mockImplementation(() => ({
      build: jest.fn().mockResolvedValue({ title: 'host-1' }),
    }));
  });

  it('transfers the selected dashboard after the chart attributes are built', async () => {
    renderModal();

    fireEvent.click(screen.getByTestId('mockDashboardPicker'));
    fireEvent.click(screen.getByTestId('changePointAddPageConfirm'));

    await waitFor(() => expect(navigateToWithEmbeddablePackages).toHaveBeenCalled());
    expect(navigateToWithEmbeddablePackages).toHaveBeenCalledWith('dashboards', {
      path: '#/view/dash-1',
      state: [
        {
          type: LENS_EMBEDDABLE_TYPE,
          serializedState: {
            attributes: { title: 'host-1', description: 'host: host-1' },
            esqlVariables: [{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }],
          },
        },
      ],
    });
  });

  it('opens a new dashboard when that is the only available destination', async () => {
    renderModal(false);
    fireEvent.click(screen.getByTestId('changePointAddPageConfirm'));

    await waitFor(() =>
      expect(navigateToWithEmbeddablePackages).toHaveBeenCalledWith(
        'dashboards',
        expect.objectContaining({ path: '#/create' })
      )
    );
  });

  it('keeps the modal open and shows one toast when a chart fails to build', async () => {
    (LensConfigBuilder as jest.Mock).mockImplementation(() => ({
      build: jest.fn().mockRejectedValue(new Error('build failed')),
    }));
    renderModal();

    fireEvent.click(screen.getByTestId('mockDashboardPicker'));
    fireEvent.click(screen.getByTestId('changePointAddPageConfirm'));

    await waitFor(() => expect(addDanger).toHaveBeenCalledTimes(1));
    expect(navigateToWithEmbeddablePackages).not.toHaveBeenCalled();
    expect(screen.getByTestId('changePointAddPageConfirm')).toBeEnabled();
  });
});
