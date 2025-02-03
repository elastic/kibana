/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AlertEventOverview } from './alert_event_overview';
import { DataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { EcsFlat } from '@elastic/ecs';

const mockRow = {
  'kibana.alert.reason': 'test-reason',
  'kibana.alert.rule.description': 'test-description',
  'event.kind': 'signal',
  _id: 'test-id',
  'kibana.alert.url': 'test-url',
};

const mockHit = {
  flattened: mockRow,
} as unknown as DataTableRecord;

const mockDataView = dataViewMock;

describe('AlertEventOverviewAccessor', () => {
  describe('expandable sections', () => {
    test('should return the expandable sections correctly', () => {
      render(<AlertEventOverview hit={mockHit} dataView={mockDataView} />);
      expect(screen.getByTestId('expandableHeader-About')).toBeVisible();
      expect(screen.getByTestId('expandableContent-About')).toBeVisible();

      fireEvent.click(screen.getByTestId('expandableHeader-About'));
      expect(screen.getByTestId('expandableContent-About')).not.toBeVisible();
    });

    test('should show expected sections', () => {
      render(<AlertEventOverview hit={mockHit} dataView={mockDataView} />);
      expect(screen.getByTestId('expandableHeader-About')).toBeVisible();

      expect(screen.getByTestId('expandableHeader-Description')).toBeVisible();
      expect(screen.getByTestId('expandableContent-Description')).toHaveTextContent(
        'test-description'
      );

      expect(screen.getByTestId('expandableHeader-Reason')).toBeVisible();
      expect(screen.getByTestId('expandableContent-Reason')).toHaveTextContent('test-reason');

      expect(screen.getByTestId('exploreSecurity')).toBeVisible();

      expect(screen.getByTestId('exploreSecurity').getAttribute('href')).toBe('test-url');
    });
  });

  describe('data', () => {
    test.only('should return Ecs description for different event types correctly', () => {
      const localMockHit = {
        flattened: {
          ...mockRow,
          'event.category': 'process',
        },
      } as unknown as DataTableRecord;

      render(<AlertEventOverview hit={localMockHit} dataView={mockDataView} />);

      expect(screen.getByTestId('expandableContent-About')).toHaveTextContent(
        EcsFlat['event.category'].allowed_values.find((i) => i.name === 'process')
          ?.description as string
      );
    });

    test('should display timeline redirect url correctly', () => {});
  });
});
