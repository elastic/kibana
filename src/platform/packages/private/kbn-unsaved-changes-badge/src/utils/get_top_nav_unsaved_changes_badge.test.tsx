/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, waitFor, screen } from '@testing-library/react';
import { getTopNavUnsavedChangesBadge } from './get_top_nav_unsaved_changes_badge';

describe('getTopNavUnsavedChangesBadge()', () => {
  test('should work correctly', async () => {
    const onRevert = jest.fn().mockResolvedValue(true);
    const badge = getTopNavUnsavedChangesBadge({ onRevert });
    const { container, getByTestId, queryByTestId } = render(
      badge.renderCustomBadge!({ badgeText: badge.badgeText })
    );
    expect(container).toMatchSnapshot();

    getByTestId('unsavedChangesBadge').click();
    await waitFor(() => {
      return Boolean(queryByTestId('revertUnsavedChangesButton'));
    });

    expect(screen.getByTestId('unsavedChangesBadgeMenuPanel')).toMatchSnapshot();
  });
});
