/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ContentBreakdown } from './content_breakdown';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';

jest.mock('../hover_popover_action', () => ({
  HoverActionPopover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockDataView = {
  fields: {
    getAll: () => [],
    getByName: () => undefined,
  },
  getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
} as unknown as DataView;

const buildHit = (fields: Record<string, unknown> = {}) =>
  buildDataTableRecord({
    _index: 'logs-*',
    _id: 'test-id',
    _score: 1,
    _source: {
      '@timestamp': Date.now(),
      ...fields,
    },
  });

describe('ContentBreakdown', () => {
  describe('Field ranking', () => {
    it('should display OTel body.text field when present (highest priority)', () => {
      const hit = buildHit({ 'body.text': 'OTel log message' });
      const formattedDoc = { message: 'OTel log message' } as any;

      render(<ContentBreakdown dataView={mockDataView} formattedDoc={formattedDoc} hit={hit} />);

      expect(screen.getByText('body.text')).toBeInTheDocument();
    });

    it('should prefer OTel body.text over ECS message when both are present in hit', () => {
      const hit = buildHit({
        'body.text': 'OTel message',
        message: 'ECS message',
      });
      const formattedDoc = { message: 'ECS message' } as any;

      render(<ContentBreakdown dataView={mockDataView} formattedDoc={formattedDoc} hit={hit} />);

      expect(screen.getByText('body.text')).toBeInTheDocument();
      expect(screen.queryByText('message')).not.toBeInTheDocument();
    });

    it('should display ECS message field when OTel body.text is not present', () => {
      const hit = buildHit({ message: 'log message' });
      const formattedDoc = { message: 'log message' } as any;

      render(<ContentBreakdown dataView={mockDataView} formattedDoc={formattedDoc} hit={hit} />);

      expect(screen.getByText('message')).toBeInTheDocument();
    });
  });
});
