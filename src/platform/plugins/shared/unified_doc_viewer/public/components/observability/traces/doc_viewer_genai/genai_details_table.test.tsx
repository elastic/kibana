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
  GenAiDetailsTable,
  getGenAiDetailFieldNames,
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

describe('getGenAiDetailFieldNames', () => {
  it('picks a single field name per canonical attribute, even when multiple shapes are present', () => {
    // A document can have the mapped attributes.* field AND a derived bare
    // gen_ai.* field for the same value — this must not produce two rows.
    const fieldNames = getGenAiDetailFieldNames({
      'attributes.gen_ai.response.model': ['gpt-4o-2024-08-06'],
      'gen_ai.response.model': ['gpt-4o-2024-08-06'],
      'attributes.gen_ai.request.temperature': [0.6],
      'labels.gen_ai_request_temperature': [0.6],
    });

    expect(fieldNames).toEqual([
      'attributes.gen_ai.response.model',
      'attributes.gen_ai.request.temperature',
    ]);
  });

  it('prefers attributes.* over bare gen_ai.* over labels.gen_ai_* when several shapes are present', () => {
    expect(
      getGenAiDetailFieldNames({
        'gen_ai.response.id': ['resp-1'],
        'labels.gen_ai_response_id': ['resp-1'],
      })
    ).toEqual(['gen_ai.response.id']);
  });

  it('falls back to whichever single shape is present', () => {
    expect(getGenAiDetailFieldNames({ 'labels.gen_ai_response_id': ['resp-1'] })).toEqual([
      'labels.gen_ai_response_id',
    ]);
  });
});

describe('summary fields in the details table', () => {
  it('resolves operation name, request model and provider so they are filterable', () => {
    expect(
      getGenAiDetailFieldNames({
        'attributes.gen_ai.operation.name': ['chat'],
        'attributes.gen_ai.request.model': ['gpt-4o'],
        'attributes.gen_ai.provider.name': ['openai'],
      })
    ).toEqual([
      'attributes.gen_ai.operation.name',
      'attributes.gen_ai.request.model',
      'attributes.gen_ai.provider.name',
    ]);
  });

  it('falls back to gen_ai.system when the provider field is absent', () => {
    expect(getGenAiDetailFieldNames({ 'attributes.gen_ai.system': ['openai'] })).toEqual([
      'attributes.gen_ai.system',
    ]);
  });

  it('hides gen_ai.system when the provider field is present (single Provider row)', () => {
    expect(
      getGenAiDetailFieldNames({
        'attributes.gen_ai.provider.name': ['openai'],
        'attributes.gen_ai.system': ['openai'],
      })
    ).toEqual(['attributes.gen_ai.provider.name']);
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

  it('renders a single row per attribute when the hit carries both the mapped and derived field shapes', () => {
    const hit = buildHit({
      'attributes.gen_ai.response.model': ['gpt-4o-2024-08-06'],
      'gen_ai.response.model': ['gpt-4o-2024-08-06'],
      'attributes.gen_ai.response.finish_reasons': ['stop'],
      'gen_ai.response.finish_reasons': ['stop'],
    });

    render(<GenAiDetailsTable hit={hit} dataView={dataView} />);

    const props = mockContentFrameworkTable.mock.calls[0][0];
    expect(props.fieldNames).toEqual([
      'attributes.gen_ai.response.model',
      'attributes.gen_ai.response.finish_reasons',
    ]);
  });
});
