/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/public';
import React from 'react';
import type { ContentFrameworkTableProps } from '../../../content_framework';
import {
  GENAI_DETAIL_FIELD_NAMES,
  GenAiDetailsTable,
  hasGenAiDetailFields,
} from './genai_details_table';

const mockContentFrameworkTable = jest.fn((props: ContentFrameworkTableProps) => (
  <div data-test-subj="mockContentFrameworkTable" />
));

jest.mock('../../../content_framework', () => ({
  ContentFrameworkTable: (props: ContentFrameworkTableProps) => mockContentFrameworkTable(props),
}));

function buildHit(flattened: Record<string, unknown>): DataTableRecord {
  return {
    id: 'doc-1',
    raw: { _id: 'doc-1', _index: 'traces-otel' },
    flattened,
  } as unknown as DataTableRecord;
}

const dataView = {} as DataView;

describe('GENAI_DETAIL_FIELD_NAMES', () => {
  it('includes all three ingest shapes for each detail field', () => {
    expect(GENAI_DETAIL_FIELD_NAMES).toEqual(
      expect.arrayContaining([
        'attributes.gen_ai.response.model',
        'gen_ai.response.model',
        'labels.gen_ai_response_model',
        'attributes.gen_ai.request.temperature',
        'gen_ai.request.temperature',
        'labels.gen_ai_request_temperature',
      ])
    );
  });
});

describe('hasGenAiDetailFields', () => {
  it('returns true when a detail field is present in any shape', () => {
    expect(hasGenAiDetailFields({ 'attributes.gen_ai.response.model': ['gpt-4o'] })).toBe(true);
    expect(hasGenAiDetailFields({ 'gen_ai.response.id': ['resp-1'] })).toBe(true);
    expect(hasGenAiDetailFields({ 'labels.gen_ai_request_temperature': [0.7] })).toBe(true);
  });

  it('returns false for non-detail gen_ai fields and unrelated fields', () => {
    expect(hasGenAiDetailFields({ 'attributes.gen_ai.input.messages': ['[]'] })).toBe(false);
    expect(hasGenAiDetailFields({ 'service.name': ['my-svc'] })).toBe(false);
  });
});

describe('GenAiDetailsTable', () => {
  beforeEach(() => {
    mockContentFrameworkTable.mockClear();
  });

  it('renders only the detail fields present on the hit and forwards the doc viewer callbacks', () => {
    const hit = buildHit({
      'attributes.gen_ai.response.model': ['gpt-4o-2024-08-06'],
      'attributes.gen_ai.request.temperature': [0.7],
      'attributes.gen_ai.input.messages': ['[]'],
      'service.name': ['my-svc'],
    });
    const filter = jest.fn();
    const onAddColumn = jest.fn();
    const onRemoveColumn = jest.fn();

    render(
      <GenAiDetailsTable
        hit={hit}
        dataView={dataView}
        filter={filter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
        columns={['service.name']}
      />
    );

    expect(screen.getByTestId('mockContentFrameworkTable')).toBeInTheDocument();
    const props = mockContentFrameworkTable.mock.calls[0][0];
    expect(props.fieldNames).toEqual([
      'attributes.gen_ai.response.model',
      'attributes.gen_ai.request.temperature',
    ]);
    expect(props.filter).toBe(filter);
    expect(props.onAddColumn).toBe(onAddColumn);
    expect(props.onRemoveColumn).toBe(onRemoveColumn);
    expect(props.columns).toEqual(['service.name']);
    expect(props.fieldConfigurations?.['attributes.gen_ai.response.model'].title).toBe(
      'Response model'
    );
    expect(props.fieldConfigurations?.['attributes.gen_ai.request.temperature'].title).toBe(
      'temperature'
    );
  });

  it('works without the optional doc viewer callbacks (waterfall flyout context)', () => {
    const hit = buildHit({ 'gen_ai.response.id': ['resp-1'] });

    render(<GenAiDetailsTable hit={hit} dataView={dataView} />);

    const props = mockContentFrameworkTable.mock.calls[0][0];
    expect(props.fieldNames).toEqual(['gen_ai.response.id']);
    expect(props.filter).toBeUndefined();
    expect(props.onAddColumn).toBeUndefined();
  });
});
