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
import { APP_HEADER_TEST_SUBJECTS, getAppMenuItemTestSubj } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { Header } from './header';

const createUser = () => userEvent.setup({ pointerEventsCheck: 0, delay: null });

const renderHeader = (
  props: Partial<React.ComponentProps<typeof Header>> = {},
  filteredCount = 2
) => {
  const onExportAll = props.onExportAll ?? jest.fn();
  const onImport = props.onImport ?? jest.fn();
  const onRefresh = props.onRefresh ?? jest.fn();

  return {
    onExportAll,
    onImport,
    onRefresh,
    ...render(
      <MockAppHeaderProvider>
        <Header
          onExportAll={onExportAll}
          onImport={onImport}
          onRefresh={onRefresh}
          filteredCount={filteredCount}
        />
      </MockAppHeaderProvider>
    ),
  };
};

describe('Header', () => {
  it('renders the title, description, and Export as the primary action', async () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Saved Objects');
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Manage and share your saved objects. To edit the underlying data of an object, go to its associated application.'
    );

    await waitFor(() => {
      expect(screen.getByTestId('exportAllObjects')).toHaveTextContent('Export 2 objects');
    });

    await openAppMenuOverflow();
    expect(screen.getByTestId(getAppMenuItemTestSubj('refresh'))).toBeInTheDocument();
    expect(screen.getByTestId('importObjects')).toBeInTheDocument();
  });

  it('calls onExportAll from the primary action', async () => {
    const user = createUser();
    const { onExportAll } = renderHeader();

    await waitFor(() => {
      expect(screen.getByTestId('exportAllObjects')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('exportAllObjects'));

    expect(onExportAll).toHaveBeenCalledTimes(1);
  });

  it('calls onImport from the Import menu item', async () => {
    const user = createUser();
    const { onImport } = renderHeader();

    await waitFor(() => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toBeInTheDocument();
    });
    await openAppMenuOverflow(user);
    await user.click(screen.getByTestId('importObjects'));

    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('calls onRefresh from the Refresh menu item', async () => {
    const user = createUser();
    const { onRefresh } = renderHeader();

    await waitFor(() => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toBeInTheDocument();
    });
    await openAppMenuOverflow(user);
    await user.click(screen.getByTestId(getAppMenuItemTestSubj('refresh')));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
