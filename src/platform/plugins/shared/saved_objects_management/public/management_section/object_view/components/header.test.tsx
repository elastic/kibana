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
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { Header } from './header';

const createUser = () => userEvent.setup({ pointerEventsCheck: 0, delay: null });

const defaultProps = {
  canDelete: true,
  canViewInApp: true,
  viewUrl: '/some-url',
  onDeleteClick: () => undefined,
  back: { href: '/', label: 'Saved Objects' },
};

const renderHeader = (props: Partial<React.ComponentProps<typeof Header>> = {}) =>
  render(
    <MockAppHeaderProvider>
      <Header {...defaultProps} {...props} />
    </MockAppHeaderProvider>
  );

describe('Header', () => {
  it('renders the inspect title and back link', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Inspect saved object'
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute('href', '/');
  });

  it('displays the provided object title', () => {
    renderHeader({ title: 'my saved search' });
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Inspect my saved search'
    );
  });

  it('only displays delete when canDelete is true', async () => {
    const { rerender } = renderHeader({ canDelete: true });

    await waitFor(() => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toBeInTheDocument();
    });
    await openAppMenuOverflow();
    expect(screen.getByTestId('savedObjectEditDelete')).toBeInTheDocument();

    rerender(
      <MockAppHeaderProvider>
        <Header {...defaultProps} canDelete={false} />
      </MockAppHeaderProvider>
    );

    expect(screen.queryByTestId('savedObjectEditDelete')).not.toBeInTheDocument();
  });

  it('calls onDeleteClick when clicking delete', async () => {
    const user = createUser();
    const onDeleteClick = jest.fn();
    renderHeader({ onDeleteClick });

    await waitFor(() => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toBeInTheDocument();
    });

    await openAppMenuOverflow(user);
    await user.click(screen.getByTestId('savedObjectEditDelete'));

    expect(onDeleteClick).toHaveBeenCalledTimes(1);
  });

  it('only displays view in app when canViewInApp is true', async () => {
    const { rerender } = renderHeader({ canViewInApp: true });

    await waitFor(() => {
      expect(screen.getByTestId('savedObjectEditViewInApp')).toHaveAttribute('href', '/some-url');
    });

    rerender(
      <MockAppHeaderProvider>
        <Header {...defaultProps} canViewInApp={false} />
      </MockAppHeaderProvider>
    );

    expect(screen.queryByTestId('savedObjectEditViewInApp')).not.toBeInTheDocument();
  });
});
