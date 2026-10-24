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
  getCachePercentage,
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

describe('cache token fields in the details table', () => {
  it('lists cache read and write right after the input and output tokens', () => {
    expect(
      getGenAiDetailFieldNames({
        'attributes.gen_ai.response.model': ['claude'],
        'attributes.gen_ai.usage.cache_write.input_tokens': [300],
        'attributes.gen_ai.usage.cache_read.input_tokens': [2100],
        'attributes.gen_ai.usage.output_tokens': [80],
        'attributes.gen_ai.usage.input_tokens': [2800],
      })
    ).toEqual([
      'attributes.gen_ai.usage.input_tokens',
      'attributes.gen_ai.usage.output_tokens',
      'attributes.gen_ai.usage.cache_read.input_tokens',
      'attributes.gen_ai.usage.cache_write.input_tokens',
      'attributes.gen_ai.response.model',
    ]);
  });

  it('resolves the cache fields from the labels.* shape too', () => {
    expect(
      getGenAiDetailFieldNames({ 'labels.gen_ai_usage_cache_read_input_tokens': [10] })
    ).toEqual(['labels.gen_ai_usage_cache_read_input_tokens']);
  });
});

describe('getCachePercentage', () => {
  it('returns the share of the input tokens as a whole percentage', () => {
    expect(getCachePercentage(8517, 12775)).toBe(67);
    expect(getCachePercentage([2100], [2800])).toBe(75);
    expect(getCachePercentage('300', '2800')).toBe(11);
    expect(getCachePercentage(2800, 2800)).toBe(100);
  });

  it('returns nothing when the share cannot be told', () => {
    expect(getCachePercentage(10, undefined)).toBeUndefined();
    expect(getCachePercentage(10, 0)).toBeUndefined();
    expect(getCachePercentage(undefined, 100)).toBeUndefined();
    expect(getCachePercentage('n/a', 100)).toBeUndefined();
    // The provider reports cache tokens apart from the input tokens: no meaningful share.
    expect(getCachePercentage(500, 100)).toBeUndefined();
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

  describe('cache token rows', () => {
    const renderFormatted = (
      flattened: Record<string, unknown>,
      fieldName: string,
      value: number
    ) => {
      render(<GenAiDetailsTable hit={buildHit(flattened)} dataView={dataView} />);
      const props = mockContentFrameworkTable.mock.calls[0][0];
      const config = props.fieldConfigurations?.[fieldName];
      return {
        config,
        rendered: render(<>{config?.formatter?.(value, value.toLocaleString('en-US'))}</>),
      };
    };

    it('titles the rows and shows each value with its share of the input tokens', () => {
      const flattened = {
        'attributes.gen_ai.usage.input_tokens': [12775],
        'attributes.gen_ai.usage.cache_read.input_tokens': [8517],
        'attributes.gen_ai.usage.cache_write.input_tokens': [1000],
      };

      const read = renderFormatted(
        flattened,
        'attributes.gen_ai.usage.cache_read.input_tokens',
        8517
      );
      expect(read.config?.title).toBe('Cache read tokens');
      expect(read.rendered.container).toHaveTextContent('8,517 (67%)');

      mockContentFrameworkTable.mockClear();
      const write = renderFormatted(
        flattened,
        'attributes.gen_ai.usage.cache_write.input_tokens',
        1000
      );
      expect(write.config?.title).toBe('Cache write tokens');
      expect(write.rendered.container).toHaveTextContent('1,000 (8%)');
    });

    it('shows the plain value when the input tokens are not on the span', () => {
      const { rendered } = renderFormatted(
        { 'attributes.gen_ai.usage.cache_read.input_tokens': [8517] },
        'attributes.gen_ai.usage.cache_read.input_tokens',
        8517
      );

      expect(rendered.container).toHaveTextContent('8,517');
      expect(rendered.container).not.toHaveTextContent('%');
    });
  });
});
