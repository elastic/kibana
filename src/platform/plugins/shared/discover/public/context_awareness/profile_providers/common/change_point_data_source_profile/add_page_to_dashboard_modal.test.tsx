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
import { CHANGE_POINT_GRID_EMBEDDABLE_TYPE } from '../../../../../common';
import { AddPageToDashboardModal } from './add_page_to_dashboard_modal';

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

const page = {
  esql: 'FROM logs-* | CHANGE_POINT count ON @timestamp',
};

const navigateToWithEmbeddablePackages = jest.fn();
const addDanger = jest.fn();

const renderModal = (canEditExisting = true) =>
  render(
    <I18nProvider>
      <AddPageToDashboardModal
        page={page}
        timeRange={{ from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' }}
        inputQuery={{ query: 'status:active', language: 'kuery' }}
        esqlVariables={[{ key: 'service', value: 'orders', type: ESQLVariableType.VALUES }]}
        controlsState={
          {
            control1: { type: 'esqlControl', order: 0, fieldName: 'service' },
          } as never
        }
        canCreateNew
        canEditExisting={canEditExisting}
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
  });

  it('transfers one following panel and the ES|QL controls by default', async () => {
    renderModal();

    expect(screen.getByText('Add a change point panel for this query.')).toBeInTheDocument();
    expect(screen.getByTestId('changePointFollowDashboard')).toBeChecked();
    fireEvent.click(screen.getByTestId('mockDashboardPicker'));
    fireEvent.click(screen.getByTestId('changePointAddPageConfirm'));

    await waitFor(() => expect(navigateToWithEmbeddablePackages).toHaveBeenCalled());
    const packages = navigateToWithEmbeddablePackages.mock.calls[0][1].state;
    expect(navigateToWithEmbeddablePackages).toHaveBeenCalledWith('dashboards', {
      path: '#/view/dash-1',
      state: packages,
    });
    expect(packages[0]).toEqual(
      expect.objectContaining({
        type: CHANGE_POINT_GRID_EMBEDDABLE_TYPE,
        serializedState: expect.objectContaining({
          esql: page.esql,
          apply_dashboard_context: true,
        }),
      })
    );
    expect(packages[0].serializedState.static_context).toBeUndefined();
    expect(packages[1]).toEqual(
      expect.objectContaining({
        type: 'esqlControl',
        serializedState: expect.objectContaining({ fieldName: 'service' }),
      })
    );
  });

  it('stores the static context and skips controls when follow dashboard is off', async () => {
    renderModal(false);
    fireEvent.click(screen.getByTestId('changePointFollowDashboard'));
    fireEvent.click(screen.getByTestId('changePointAddPageConfirm'));

    await waitFor(() => expect(navigateToWithEmbeddablePackages).toHaveBeenCalled());
    const packages = navigateToWithEmbeddablePackages.mock.calls[0][1].state;
    expect(packages).toHaveLength(1);
    expect(packages[0].serializedState.apply_dashboard_context).toBe(false);
    expect(packages[0].serializedState.time_range).toEqual({
      from: '2020-01-01T00:00:00.000Z',
      to: '2020-01-02T00:00:00.000Z',
    });
    expect(packages[0].serializedState.static_context).toEqual(
      expect.objectContaining({
        query: { expression: 'status:active', language: 'kql' },
      })
    );
  });

  it('keeps the modal open and shows one toast when navigation fails', async () => {
    navigateToWithEmbeddablePackages.mockRejectedValue(new Error('navigation failed'));
    renderModal();

    fireEvent.click(screen.getByTestId('mockDashboardPicker'));
    fireEvent.click(screen.getByTestId('changePointAddPageConfirm'));

    await waitFor(() => expect(addDanger).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('changePointAddPageConfirm')).toBeEnabled();
  });
});
