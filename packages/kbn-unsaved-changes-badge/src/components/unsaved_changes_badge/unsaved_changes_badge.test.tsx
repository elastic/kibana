/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, act, screen, waitFor } from '@testing-library/react';
import { UnsavedChangesBadge } from './unsaved_changes_badge';

describe('<UnsavedChangesBadge />', () => {
  test('should render correctly', async () => {
    const onRevert = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <UnsavedChangesBadge badgeText="test" onRevert={onRevert} />
    );
    expect(getByTestId('unsavedChangesBadge')).toBeInTheDocument();

    getByTestId('unsavedChangesBadge').click();
    await waitFor(() => {
      return Boolean(queryByTestId('unsavedChangesBadgeMenuPanel'));
    });
    expect(queryByTestId('revertUnsavedChangesButton')).toBeInTheDocument();
    expect(queryByTestId('saveUnsavedChangesButton')).not.toBeInTheDocument();
    expect(queryByTestId('saveUnsavedChangesAsButton')).not.toBeInTheDocument();

    expect(onRevert).not.toHaveBeenCalled();

    act(() => {
      getByTestId('revertUnsavedChangesButton').click();
    });
    expect(onRevert).toHaveBeenCalled();
  });

  test('should show all menu items', async () => {
    const onRevert = jest.fn().mockResolvedValue(true);
    const onSave = jest.fn().mockResolvedValue(true);
    const onSaveAs = jest.fn().mockResolvedValue(true);
    const { getByTestId, queryByTestId, container } = render(
      <UnsavedChangesBadge
        badgeText="test"
        onRevert={onRevert}
        onSave={onSave}
        onSaveAs={onSaveAs}
      />
    );

    expect(container).toMatchSnapshot();

    getByTestId('unsavedChangesBadge').click();
    await waitFor(() => {
      return Boolean(queryByTestId('unsavedChangesBadgeMenuPanel'));
    });
    expect(queryByTestId('revertUnsavedChangesButton')).toBeInTheDocument();
    expect(queryByTestId('saveUnsavedChangesButton')).toBeInTheDocument();
    expect(queryByTestId('saveUnsavedChangesAsButton')).toBeInTheDocument();

    expect(screen.getByTestId('unsavedChangesBadgeMenuPanel')).toMatchSnapshot();
  });

  test('should call callbacks', async () => {
    const onRevert = jest.fn().mockResolvedValue(true);
    const onSave = jest.fn().mockResolvedValue(true);
    const onSaveAs = jest.fn().mockResolvedValue(true);
    const { getByTestId, queryByTestId } = render(
      <UnsavedChangesBadge
        badgeText="test"
        onRevert={onRevert}
        onSave={onSave}
        onSaveAs={onSaveAs}
      />
    );
    act(() => {
      getByTestId('unsavedChangesBadge').click();
    });
    await waitFor(() => {
      return Boolean(queryByTestId('unsavedChangesBadgeMenuPanel'));
    });

    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      getByTestId('saveUnsavedChangesButton').click();
    });
    expect(onSave).toHaveBeenCalled();
  });
});
