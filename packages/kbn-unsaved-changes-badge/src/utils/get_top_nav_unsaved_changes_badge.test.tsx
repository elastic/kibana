/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render } from '@testing-library/react';
import { waitFor, screen } from '@testing-library/dom';
import { getTopNavUnsavedChangesBadge } from './get_top_nav_unsaved_changes_badge';

describe('getTopNavUnsavedChangesBadge()', () => {
  test('should work correctly', async () => {
    const onReset = jest.fn().mockResolvedValue(true);
    const badge = getTopNavUnsavedChangesBadge({ onReset });
    const { container, getByTestId, queryByTestId } = render(
      badge.renderCustomBadge!({ badgeText: badge.badgeText })
    );
    expect(container).toMatchSnapshot();

    getByTestId('unsavedChangesBadge').click();
    await waitFor(() => {
      return Boolean(queryByTestId('resetUnsavedChangesMenuItem'));
    });

    expect(screen.getByTestId('unsavedChangesBadgeMenuPanel')).toMatchSnapshot();
  });
});
