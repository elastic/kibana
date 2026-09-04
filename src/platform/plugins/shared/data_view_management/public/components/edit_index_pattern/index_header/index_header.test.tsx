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
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import type { DataView } from '@kbn/data-views-plugin/public';
import { IndexHeader } from './index_header';

const createDataView = (overrides: Partial<DataView> = {}): DataView =>
  ({
    id: 'logs-id',
    getName: () => 'logs-*',
    isPersisted: () => true,
    ...overrides,
  } as DataView);

const renderHeader = (props: Partial<React.ComponentProps<typeof IndexHeader>> = {}) =>
  render(
    <MemoryRouter>
      <MockAppHeaderProvider>
        <IndexHeader
          indexPattern={createDataView()}
          canSave={true}
          back={{ href: '/', label: 'Data Views' }}
          {...props}
        />
      </MockAppHeaderProvider>
    </MemoryRouter>
  );

describe('IndexHeader', () => {
  it('renders the data view name and back link', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('logs-*');
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute('href', '/');
  });

  it('renders Edit as the primary action when the handler is provided', async () => {
    const editIndexPatternClick = jest.fn();
    renderHeader({ editIndexPatternClick });

    await waitFor(() => {
      expect(screen.getByTestId('editIndexPatternButton')).toBeInTheDocument();
    });
  });

  it('does not render Edit when canSave is false', async () => {
    renderHeader({ canSave: false, editIndexPatternClick: jest.fn() });

    await waitFor(() => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('editIndexPatternButton')).not.toBeInTheDocument();
  });

  it('deletes the data view from the AppHeader menu', async () => {
    const user = userEvent.setup();
    const deleteIndexPatternClick = jest.fn();
    renderHeader({ deleteIndexPatternClick });

    await waitFor(() => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toBeInTheDocument();
    });

    await openAppMenuOverflow();
    await user.click(screen.getByTestId('deleteIndexPatternButton'));

    expect(deleteIndexPatternClick).toHaveBeenCalled();
  });

  it('hides delete for managed data views', async () => {
    renderHeader({
      deleteIndexPatternClick: undefined,
      editIndexPatternClick: jest.fn(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('editIndexPatternButton')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('deleteIndexPatternButton')).not.toBeInTheDocument();
  });
});
