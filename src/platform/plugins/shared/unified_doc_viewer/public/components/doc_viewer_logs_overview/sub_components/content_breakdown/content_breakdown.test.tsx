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

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCodeBlock: ({ children }: { children?: React.ReactNode }) => (
    <pre>
      <code data-test-subj="codeBlock">{children}</code>
    </pre>
  ),
}));

jest.mock('../hover_popover_action', () => ({
  HoverActionPopover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockReactConvert = jest.fn((value: unknown) => value);

jest.mock('../../../../plugin', () => ({
  getUnifiedDocViewerServices: () => ({
    fieldFormats: {
      getDefaultInstance: () => ({
        reactConvert: mockReactConvert,
      }),
    },
  }),
}));

const mockDataView = {
  fields: {
    getAll: () => [],
    getByName: () => undefined,
  },
  getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
} as unknown as DataView;

const buildHit = (fields: Record<string, unknown> = {}, highlight?: Record<string, string[]>) =>
  buildDataTableRecord({
    _index: 'logs-*',
    _id: 'test-id',
    _score: 1,
    _source: {
      '@timestamp': Date.now(),
      ...fields,
    },
    highlight,
  });

describe('ContentBreakdown', () => {
  beforeEach(() => {
    mockReactConvert.mockClear();
  });

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

  describe('Message rendering', () => {
    it('escapes angle brackets so log text is not treated as HTML', () => {
      const hit = buildHit({
        message:
          '2026-02-06 04:41:12,718 INFO some.program.module(128):Search for <John Doe> found <48> items in <0.314> seconds',
      });
      const formattedDoc = { message: 'log message' } as any;

      const { container } = render(
        <ContentBreakdown dataView={mockDataView} formattedDoc={formattedDoc} hit={hit} />
      );

      expect(screen.getByTestId('codeBlock')).toHaveTextContent(
        '2026-02-06 04:41:12,718 INFO some.program.module(128):Search for <John Doe> found <48> items in <0.314> seconds'
      );

      // Ensure the browser didn't interpret `<John Doe>` as a real element
      expect(container.querySelector('john')).toBeNull();
    });

    it('renders pretty-printed JSON when message is valid JSON and skips reactConvert', () => {
      const json = { foo: { bar: true } };
      const message = JSON.stringify(json);
      const hit = buildHit({ message });
      const formattedDoc = { message } as any;

      render(<ContentBreakdown dataView={mockDataView} formattedDoc={formattedDoc} hit={hit} />);

      const codeBlock = screen.getByTestId('codeBlock');
      expect(codeBlock.textContent).toBe(JSON.stringify(json, null, 2));
      // The JSON path uses formattedValue directly — reactConvert should not be called
      expect(mockReactConvert).not.toHaveBeenCalled();
    });

    it('applies highlights even when field is not in data view (e.g., OTel body.text)', () => {
      const fieldName = 'body.text';
      const message = 'OTel log message with search term';
      const highlights = [
        'OTel log message with @kibana-highlighted-field@search@/kibana-highlighted-field@ term',
      ];
      const hit = buildHit({ [fieldName]: message }, { [fieldName]: highlights });
      const formattedDoc = { message } as any;

      // Mock the formatter to return React nodes with highlighted content
      mockReactConvert.mockImplementationOnce(() => (
        <>
          OTel log message with <mark className="ffSearch__highlight">search</mark> term
        </>
      ));

      const { container } = render(
        <ContentBreakdown dataView={mockDataView} formattedDoc={formattedDoc} hit={hit} />
      );

      // Verify the formatter was called with field name for highlight lookup
      // even though the field is not in the data view (getByName returns undefined)
      expect(mockReactConvert).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          field: { name: fieldName },
          hit: expect.objectContaining({
            highlight: { [fieldName]: highlights },
          }),
        })
      );

      // Verify the highlighted content is rendered
      const markElement = container.querySelector('mark.ffSearch__highlight');
      expect(markElement).toBeInTheDocument();
      expect(markElement).toHaveTextContent('search');
    });

    it('uses DataViewField from data view when field exists and applies highlights', () => {
      const fieldName = 'message';
      const message = 'log message with search term';
      const highlights = [
        'log message with @kibana-highlighted-field@search@/kibana-highlighted-field@ term',
      ];
      const hit = buildHit({ [fieldName]: message }, { [fieldName]: highlights });
      const formattedDoc = { message } as any;

      const mockDataViewField = {
        name: fieldName,
        type: 'string',
        esTypes: ['text'],
        searchable: true,
        aggregatable: false,
      };

      const dataViewWithField = {
        ...mockDataView,
        fields: {
          getAll: () => [mockDataViewField],
          getByName: (name: string) => (name === fieldName ? mockDataViewField : undefined),
        },
      } as unknown as DataView;

      // Mock the formatter to return React nodes with highlighted content
      mockReactConvert.mockImplementationOnce(() => (
        <>
          log message with <mark className="ffSearch__highlight">search</mark> term
        </>
      ));

      const { container } = render(
        <ContentBreakdown dataView={dataViewWithField} formattedDoc={formattedDoc} hit={hit} />
      );

      // Verify the formatter was called with full DataViewField (not just { name })
      expect(mockReactConvert).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          field: mockDataViewField,
          hit: expect.objectContaining({
            highlight: { [fieldName]: highlights },
          }),
        })
      );

      // Verify the highlighted content is rendered
      const markElement = container.querySelector('mark.ffSearch__highlight');
      expect(markElement).toBeInTheDocument();
      expect(markElement).toHaveTextContent('search');
    });
  });
});
