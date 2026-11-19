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
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import type {
  PointEventAnnotationRow,
  ManualRangeEventAnnotationRow,
} from '@kbn/event-annotation-plugin/common';
import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import type { FormatFactory } from '@kbn/field-formats-plugin/common';
import { getFieldFormatsRegistry } from '@kbn/field-formats-plugin/public/mocks';
import { Annotations, getAnnotationsGroupedByInterval } from './annotations';

jest.mock('@elastic/charts', () => ({
  ...jest.requireActual('@elastic/charts'),
  RectAnnotation: ({ customTooltip }: { customTooltip: () => React.ReactNode }) => (
    <>{customTooltip()}</>
  ),
}));

const registry = getFieldFormatsRegistry(coreMock.createSetup());
const formatFactory: FormatFactory = (format) => registry.deserialize(format);
const columns: DatatableColumn[] = [
  { id: 'field:["events","message"]', name: 'message', meta: { type: 'string' } },
  {
    id: 'field:["events","count"]',
    name: 'count',
    meta: { type: 'number', params: { id: 'number', params: { pattern: '0.00' } } },
  },
];
const point: PointEventAnnotationRow = {
  id: 'events',
  type: 'point',
  time: '2026-01-01T00:30:00.000Z',
  timebucket: '2026-01-01T00:00:00.000Z',
  label: 'Deployments',
  textVisibility: true,
  textField: '["events","message"]',
  'field:["events","message"]': 'Version 2',
  'field:["events","count"]': 12,
};

describe('ES|QL annotation rendering', () => {
  it('uses text-column values for point markers without requiring a field formatter', () => {
    const [annotation] = getAnnotationsGroupedByInterval(
      [point],
      [],
      columns,
      formatFactory,
      'YYYY-MM-DD HH:mm',
      false
    );
    expect(annotation.label).toBe('Version 2');
  });

  it('uses result-column formatters for point text and tooltip values', () => {
    const [annotation] = getAnnotationsGroupedByInterval(
      [{ ...point, textField: '["events","count"]' }],
      [],
      columns,
      formatFactory,
      'YYYY-MM-DD HH:mm',
      false
    );
    expect(annotation.label).toBe('12.00');
    const Tooltip = annotation.customTooltip;
    if (!Tooltip) throw new Error('Expected an annotation tooltip');
    render(
      <EuiThemeProvider>
        <Tooltip datum={{ dataValue: 0 }} />
      </EuiThemeProvider>
    );
    expect(screen.getByText('message:')).toBeInTheDocument();
    expect(screen.getByText('count:')).toBeInTheDocument();
    expect(screen.getByText('12.00')).toBeInTheDocument();
  });

  it('sums skipped counts reported by different annotations in one bucket', () => {
    const [annotation] = getAnnotationsGroupedByInterval(
      [
        { ...point, id: 'a', skippedCount: 2 },
        { ...point, id: 'b', skippedCount: 3 },
        { ...point, id: 'c' },
      ],
      [],
      columns,
      formatFactory,
      'YYYY-MM-DD HH:mm',
      false
    );
    const Tooltip = annotation.customTooltip;
    if (!Tooltip) throw new Error('Expected an annotation tooltip');
    render(
      <I18nProvider>
        <EuiThemeProvider>
          <Tooltip datum={{ dataValue: 0 }} />
        </EuiThemeProvider>
      </I18nProvider>
    );
    expect(screen.getByText('+5 more…')).toBeInTheDocument();
  });

  it('renders dynamic range text and extra tooltip columns with their formatters', () => {
    const range: ManualRangeEventAnnotationRow & DatatableRow = {
      ...point,
      id: 'events:0',
      type: 'range',
      endTime: '2026-01-01T01:30:00.000Z',
      outside: true,
    };
    render(
      <Annotations
        groupedLineAnnotations={[]}
        rangeAnnotations={[range]}
        columns={columns}
        formatFactory={formatFactory}
        timeFormat="YYYY-MM-DD HH:mm"
        isHorizontal={false}
        paddingMap={{}}
        outsideDimension={8}
      />,
      { wrapper: EuiThemeProvider }
    );
    expect(screen.getByRole('heading', { name: 'Version 2' })).toBeInTheDocument();
    expect(screen.getByText('count:')).toBeInTheDocument();
    expect(screen.getByText('12.00')).toBeInTheDocument();
    expect(screen.getByText(/ — /)).toBeInTheDocument();
  });

  it('renders every row of a bucket without duplicate React keys when events share a timestamp', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const [annotation] = getAnnotationsGroupedByInterval(
      [
        { ...point, 'field:["events","message"]': 'First deploy' },
        { ...point, 'field:["events","message"]': 'Second deploy' },
      ],
      [],
      columns,
      formatFactory,
      'YYYY-MM-DD HH:mm',
      false
    );
    const Tooltip = annotation.customTooltip;
    if (!Tooltip) throw new Error('Expected an annotation tooltip');
    render(
      <I18nProvider>
        <EuiThemeProvider>
          <Tooltip datum={{ dataValue: 0 }} />
        </EuiThemeProvider>
      </I18nProvider>
    );
    expect(screen.getAllByText('Deployments')).toHaveLength(2);
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('same key'),
      expect.anything(),
      expect.anything()
    );
    consoleError.mockRestore();
  });

  it('shows the skipped count in a range tooltip', () => {
    const range: ManualRangeEventAnnotationRow & DatatableRow = {
      ...point,
      id: 'events:0',
      type: 'range',
      endTime: '2026-01-01T01:30:00.000Z',
      skippedCount: 4,
    };
    render(
      <I18nProvider>
        <EuiThemeProvider>
          <Annotations
            groupedLineAnnotations={[]}
            rangeAnnotations={[range]}
            columns={columns}
            formatFactory={formatFactory}
            timeFormat="YYYY-MM-DD HH:mm"
            isHorizontal={false}
            paddingMap={{}}
            outsideDimension={8}
          />
        </EuiThemeProvider>
      </I18nProvider>
    );
    expect(screen.getByText('+4 more…')).toBeInTheDocument();
  });
});
