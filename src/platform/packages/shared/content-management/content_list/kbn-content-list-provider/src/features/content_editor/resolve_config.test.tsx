/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ContentInsightsClientPublic } from '@kbn/content-management-content-insights-public';
import { createActivityAppendRows } from './resolve_config';
import type { ContentListItem } from '../../item';

// Mock the DefaultActivityRows component.
jest.mock('./default_activity_rows', () => ({
  DefaultActivityRows: ({
    item,
    entityNamePlural,
  }: {
    item: ContentListItem;
    entityNamePlural: string;
  }) => (
    <div data-test-subj="mock-activity-rows">
      Activity for {item.id} ({entityNamePlural})
    </div>
  ),
}));

describe('resolve_config', () => {
  describe('createActivityAppendRows', () => {
    it('should return a function that renders DefaultActivityRows', () => {
      const mockContentInsightsClient = {} as ContentInsightsClientPublic;
      const appendRows = createActivityAppendRows(mockContentInsightsClient, 'dashboards');

      expect(typeof appendRows).toBe('function');
    });

    it('should render activity rows with item and entityNamePlural', () => {
      const mockContentInsightsClient = {} as ContentInsightsClientPublic;
      const appendRows = createActivityAppendRows(mockContentInsightsClient, 'dashboards');

      const mockItem: ContentListItem = {
        id: 'item-1',
        title: 'Test Item',
        type: 'dashboard',
      };

      const { getByTestId } = render(<>{appendRows?.(mockItem)}</>);

      expect(getByTestId('mock-activity-rows')).toHaveTextContent(
        'Activity for item-1 (dashboards)'
      );
    });
  });
});
