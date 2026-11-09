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
import {
  FAILED_SPAN_CONDITION,
  LatencyMap,
  selectionToEsqlCondition,
} from '@kbn/trace-latency-map';
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
  minDuration: 1_000_000,
  maxDuration: 5_000_000,
};
const selectionClause = selectionToEsqlCondition(selection);
// A cell outside the committed selection: clicks must work on any cell of the map.
const cell = {
  from: '2026-10-26T10:20:00.000Z',
  to: '2026-10-26T10:25:00.000Z',
  minDuration: 8_000_000,
  maxDuration: 16_000_000,
  spans: 12,
  failed: 2,
};

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

// The clauses name fields of every trace family, so the query is told to null the unmapped ones.
const SET_NULLIFY = 'SET unmapped_fields="NULLIFY";\n';

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
      `${SET_NULLIFY}FROM traces-apm*\n| WHERE ${nextCondition}`
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

  it('replaces a clause the rendered props have not caught up with yet', () => {
    // The commit before this one is in the query, but Discover has not pushed the new
    // fetch params: the updater must still find and replace it rather than stack clauses.
    const { actions, mapProps } = renderView({ filters: ['service.name == "cart"'] });
    const nextCondition = selectionToEsqlCondition({
      ...selection,
      to: '2026-10-26T10:10:00.000Z',
    });
    mapProps.onSelectionCommit({ ...selection, to: '2026-10-26T10:10:00.000Z' }, nextCondition);
    const updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    expect(updater(`FROM traces-apm*\n| WHERE ${selectionClause}`)).toBe(
      `${SET_NULLIFY}FROM traces-apm*\n| WHERE ${nextCondition}`
    );
  });

  it('reads the failure filter from the query and keeps it out of the map source', () => {
    const { mapProps } = renderView({
      filters: ['service.name == "cart"', FAILED_SPAN_CONDITION, selectionClause],
    });
    expect(mapProps.failedOnly).toBe(true);
    expect(mapProps.selection).toEqual(selection);
    // The map still reads the whole range: it paints "failed only" from the counts it has.
    expect(mapProps.source.filters).toEqual(['service.name == "cart"']);
  });

  it('writes the failure filter into the query when the switch goes on, and removes it after', () => {
    const { actions, mapProps } = renderView();
    expect(mapProps.failedOnly).toBe(false);

    mapProps.onFailedOnlyChange!(true);
    let updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    const withFilter = updater('FROM traces-apm*');
    expect(withFilter).toBe(`${SET_NULLIFY}FROM traces-apm*\n| WHERE ${FAILED_SPAN_CONDITION}`);

    mapProps.onFailedOnlyChange!(false);
    updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    expect(updater(withFilter)).toBe(`${SET_NULLIFY}FROM traces-apm*`);
  });

  it('replaces a failure filter already in the query rather than stacking another', () => {
    const { actions, mapProps } = renderView();
    mapProps.onFailedOnlyChange!(true);
    const updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    expect(updater(`FROM traces-apm*\n| WHERE ${FAILED_SPAN_CONDITION}`)).toBe(
      `${SET_NULLIFY}FROM traces-apm*\n| WHERE ${FAILED_SPAN_CONDITION}`
    );
  });

  it('leaves the failure filter in place when the selection changes or clears', () => {
    const { actions, mapProps } = renderView({
      filters: ['service.name == "cart"', FAILED_SPAN_CONDITION, selectionClause],
    });
    mapProps.onSelectionCommit(undefined, undefined);
    const updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    expect(
      updater(`FROM traces-apm*\n| WHERE ${FAILED_SPAN_CONDITION}\n| WHERE ${selectionClause}`)
    ).toBe(`FROM traces-apm*\n| WHERE ${FAILED_SPAN_CONDITION}`);
  });

  it('opens the newest span of a clicked cell in the document flyout', async () => {
    jest.mocked(getESQLResults).mockResolvedValue({
      response: {
        columns: [{ name: 'service.name', type: 'keyword' }],
        values: [['cart']],
      },
    } as Awaited<ReturnType<typeof getESQLResults>>);
    const { actions, mapProps } = renderView({
      filters: ['service.name == "cart"', selectionClause],
    });
    await act(() => mapProps.onCellClick!(cell));
    const call = jest.mocked(getESQLResults).mock.lastCall?.[0];
    // The cell bounds the span, under the query's own filters but not the selection:
    // cells outside a committed selection must stay clickable.
    expect(call?.esqlQuery).toContain(selectionToEsqlCondition(cell));
    expect(call?.esqlQuery).toContain('service.name == "cart"');
    expect(call?.esqlQuery).not.toContain(selectionClause);
    expect(call?.dropNullColumns).toBe(true);
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
