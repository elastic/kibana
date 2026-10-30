/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { getESQLResults } from '@kbn/esql-utils';
import { LatencyMap, selectionToEsqlCondition } from '@kbn/trace-latency-map';
import type { LatencyMapProps } from '@kbn/trace-latency-map';
import { TracesLatencyMapView } from './latency_map_view';
import type { TracesLatencyMapViewProps } from './latency_map_view';

jest.mock('@kbn/trace-latency-map', () => ({
  ...jest.requireActual('@kbn/trace-latency-map'),
  LatencyMap: jest.fn(() => null),
}));
jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLResults: jest.fn(),
}));

const selection = {
  from: '2026-10-26T10:00:00.000Z',
  to: '2026-10-26T10:05:00.000Z',
  minDurationUs: 1000,
  maxDurationUs: 5000,
};
const selectionClause = selectionToEsqlCondition(selection);
const cell = { ...selection, spans: 12, failed: 2 };

const services = {
  uiSettings: { get: jest.fn().mockReturnValue('Browser') },
  data: { search: { search: jest.fn() } },
} as unknown as TracesLatencyMapViewProps['services'];

const renderView = (overrides: Partial<TracesLatencyMapViewProps> = {}) => {
  const actions = { updateESQLQuery: jest.fn(), setExpandedDoc: jest.fn() };
  render(
    <TracesLatencyMapView
      indexPattern="traces-apm*"
      filters={['service.name == "cart"']}
      timeFrom="2026-10-26T10:00:00.000Z"
      timeTo="2026-10-26T11:00:00.000Z"
      services={services}
      actions={actions}
      {...overrides}
    />
  );
  const mapProps = jest.mocked(LatencyMap).mock.lastCall?.[0] as LatencyMapProps;
  return { actions, mapProps };
};

describe('TracesLatencyMapView', () => {
  beforeEach(() => {
    jest.mocked(LatencyMap).mockClear();
    jest.mocked(getESQLResults).mockReset();
  });

  it('reads the selection from the query and keeps it out of the map source', () => {
    const { mapProps } = renderView({
      filters: ['service.name == "cart"', selectionClause],
    });
    expect(mapProps.selection).toEqual(selection);
    expect(mapProps.source.filters).toEqual(['service.name == "cart"']);
  });

  it('writes a committed selection into the query, replacing the previous one', () => {
    const { actions, mapProps } = renderView({
      filters: ['service.name == "cart"', selectionClause],
    });
    const nextCondition = selectionToEsqlCondition({
      ...selection,
      to: '2026-10-26T10:10:00.000Z',
    });
    mapProps.onSelectionCommit({ ...selection, to: '2026-10-26T10:10:00.000Z' }, nextCondition);
    const updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    expect(updater(`FROM traces-apm*\n| WHERE ${selectionClause}`)).toBe(
      `FROM traces-apm*\n| WHERE ${nextCondition}`
    );
  });

  it('restores the previous query when the selection is cleared', () => {
    const { actions, mapProps } = renderView({
      filters: ['service.name == "cart"', selectionClause],
    });
    mapProps.onSelectionCommit(undefined, undefined);
    const updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    expect(updater(`FROM traces-apm*\n| WHERE ${selectionClause}`)).toBe('FROM traces-apm*');
  });

  it('opens the newest span of a clicked cell in the document flyout', async () => {
    jest.mocked(getESQLResults).mockResolvedValue({
      response: {
        columns: [{ name: 'service.name', type: 'keyword' }],
        values: [['cart']],
      },
    } as Awaited<ReturnType<typeof getESQLResults>>);
    const { actions, mapProps } = renderView();
    await act(() => mapProps.onCellClick!(cell));
    const query = jest.mocked(getESQLResults).mock.lastCall?.[0].esqlQuery;
    expect(query).toContain(selectionToEsqlCondition(cell));
    expect(actions.setExpandedDoc).toHaveBeenCalledWith(
      expect.objectContaining({ flattened: { 'service.name': 'cart' } })
    );
  });

  it('leaves the view as it is when the cell has no span to open', async () => {
    jest.mocked(getESQLResults).mockRejectedValue(new Error('shards failed'));
    const { actions, mapProps } = renderView();
    await act(() => mapProps.onCellClick!(cell));
    expect(actions.setExpandedDoc).not.toHaveBeenCalled();
  });

  it('offers no cell click without a document flyout to open', () => {
    const { mapProps } = renderView({
      actions: { updateESQLQuery: jest.fn() },
    });
    expect(mapProps.onCellClick).toBeUndefined();
  });
});
