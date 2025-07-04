/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactElement } from 'react';
import { NoDataPopover } from './no_data_popover';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { fireEvent, screen, waitFor } from '@testing-library/react';

describe('NoDataPopover', () => {
  const createMockStorage = () => ({
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  });

  const renderComponent = (
    props?: Partial<{
      showNoDataPopover?: boolean;
      storage: IStorageWrapper;
      children: ReactElement;
    }>
  ) =>
    renderWithI18n(
      <NoDataPopover storage={createMockStorage()} showNoDataPopover={false} {...props}>
        <span data-test-subj="a_child" />
      </NoDataPopover>
    );

  it('should hide popover if showNoDataPopover is set to false', async () => {
    renderComponent();
    const popover = screen.queryByRole('dialog');
    expect(popover).not.toBeInTheDocument();
    expect(screen.getByTestId('a_child')).toBeInTheDocument();
  });

  it('should hide popover if showNoDataPopover is set to true, but local storage flag is set', () => {
    const storage = createMockStorage();
    storage.get.mockReturnValue(true);
    renderComponent({ storage });
    const popover = screen.queryByRole('dialog');
    expect(popover).not.toBeInTheDocument();
  });

  it('should render popover if showNoDataPopover is set to true and local storage flag is not set', async () => {
    renderComponent({ showNoDataPopover: true });
    const popover = screen.queryByRole('dialog');
    expect(popover).toBeInTheDocument();
  });

  it('should hide popover if it is closed', async () => {
    const props = {
      showNoDataPopover: true,
      storage: createMockStorage(),
    };
    renderComponent(props);
    const popover = screen.queryByRole('dialog');
    expect(popover).toBeInTheDocument();
    const closeButton = screen.getByTestId('noDataPopoverDismissButton');
    fireEvent.click(closeButton);
    await waitFor(() => expect(closeButton).not.toBeInTheDocument());
    expect(popover).not.toBeInTheDocument();
  });

  it('should set local storage flag and hide on closing with button', async () => {
    const props = {
      showNoDataPopover: true,
      storage: createMockStorage(),
    };
    renderComponent(props);

    const popover = screen.queryByRole('dialog');
    expect(popover).toBeInTheDocument();
    const closeButton = screen.getByTestId('noDataPopoverDismissButton');
    fireEvent.click(closeButton);
    await waitFor(() => expect(closeButton).not.toBeInTheDocument());
    expect(props.storage.set).toHaveBeenCalledWith(expect.any(String), true);
    expect(popover).not.toBeInTheDocument();
  });
});
