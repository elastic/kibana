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
  TRACE_CONDITION_FIELDS,
  operationToEsqlCondition,
  selectionToEsqlCondition,
} from '@kbn/trace-latency-map';
import type { LatencyMapProps } from '@kbn/trace-latency-map';
import { extractFilters } from '../../../utils';
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

// Unresolved by default: the SET stays until field caps has answered, as in the view.
const getFieldsForWildcard = jest.fn((): Promise<Array<{ name: string }>> => new Promise(() => {}));
const services = {
  uiSettings: { get: jest.fn().mockReturnValue('Browser') },
  data: { search: { search: jest.fn() } },
  dataViews: { getFieldsForWildcard },
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
    getFieldsForWildcard.mockImplementation(() => new Promise(() => {}));
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

  it('restores the previous query when the selection is cleared, its SET prefix included', () => {
    const { actions, mapProps } = renderView({
      filters: ['service.name == "cart"', selectionClause],
    });
    mapProps.onSelectionCommit(undefined, undefined);
    const updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    expect(updater(`FROM traces-apm*\n| WHERE ${selectionClause}`)).toBe('FROM traces-apm*');
    // The SET the map wrote on append leaves with the last map clause.
    expect(updater(`${SET_NULLIFY}FROM traces-apm*\n| WHERE ${selectionClause}`)).toBe(
      'FROM traces-apm*'
    );
    // While another map clause remains, the SET stays for it.
    expect(
      updater(
        `${SET_NULLIFY}FROM traces-apm*\n| WHERE ${FAILED_SPAN_CONDITION}\n| WHERE ${selectionClause}`
      )
    ).toBe(`${SET_NULLIFY}FROM traces-apm*\n| WHERE ${FAILED_SPAN_CONDITION}`);
  });

  it('writes the focused operation into the query, replacing the previous one', () => {
    const { actions, mapProps } = renderView();
    const operation = { service: 'cart', name: 'GET /cart' };
    const condition = operationToEsqlCondition(operation);
    mapProps.onFocusOperation!(operation, condition);
    const updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    const previous = operationToEsqlCondition({ service: 'checkout', name: 'POST /checkout' });
    expect(updater(`FROM traces-apm*\n| WHERE ${previous}`)).toBe(
      `${SET_NULLIFY}FROM traces-apm*\n| WHERE ${condition}`
    );
  });

  it('restores the query when the operation is cleared, and reads it back as the badge', () => {
    const operation = { service: 'cart', name: 'GET /cart' };
    const condition = operationToEsqlCondition(operation);
    const { actions, mapProps } = renderView({
      filters: ['service.name == "cart"', condition],
    });
    // A reload or a shared link restores the focused operation from the clause.
    expect(mapProps.focusedOperation).toEqual(operation);
    // The clause narrows the map too: it stays in the source, unlike the selection's.
    expect(mapProps.source.filters).toEqual(['service.name == "cart"', condition]);
    mapProps.onClearOperation!();
    const updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    expect(updater(`FROM traces-apm*\n| WHERE ${condition}`)).toBe('FROM traces-apm*');
    expect(updater(`${SET_NULLIFY}FROM traces-apm*\n| WHERE ${condition}`)).toBe(
      'FROM traces-apm*'
    );
  });

  it('drops the SET once field caps says every referenced field is mapped', async () => {
    getFieldsForWildcard.mockResolvedValueOnce(TRACE_CONDITION_FIELDS.map((name) => ({ name })));
    const { actions, mapProps } = renderView();
    // Let the field-caps answer land before committing.
    await act(async () => {});
    mapProps.onSelectionCommit(selection, selectionClause);
    const updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    expect(updater('FROM traces-apm*')).toBe(`FROM traces-apm*\n| WHERE ${selectionClause}`);
  });

  it('keeps the SET while a referenced field is missing from the pattern', async () => {
    getFieldsForWildcard.mockResolvedValueOnce([{ name: 'transaction.duration.us' }]);
    const { actions, mapProps } = renderView();
    await act(async () => {});
    mapProps.onSelectionCommit(selection, selectionClause);
    const updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    expect(updater('FROM traces-apm*')).toBe(
      `${SET_NULLIFY}FROM traces-apm*\n| WHERE ${selectionClause}`
    );
  });

  it('keeps the SET when the field check fails: the safe default always runs', async () => {
    getFieldsForWildcard.mockRejectedValueOnce(new Error('no caps'));
    const { actions, mapProps } = renderView();
    await act(async () => {});
    mapProps.onSelectionCommit(selection, selectionClause);
    const updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    expect(updater('FROM traces-apm*')).toBe(
      `${SET_NULLIFY}FROM traces-apm*\n| WHERE ${selectionClause}`
    );
  });

  it('round-trips an operation whose name holds a pipe and "where" through the query', () => {
    // The clause carries arbitrary names; extracting the query's filters must not shatter it.
    const operation = { service: 'cart', name: 'GET /where|:id' };
    const condition = operationToEsqlCondition(operation);
    const { mapProps } = renderView({
      filters: extractFilters(`FROM traces-apm* | WHERE ${condition}`),
    });
    expect(mapProps.focusedOperation).toEqual(operation);
    expect(mapProps.source.filters).toEqual([condition]);
  });

  it('clears a selection the picked time range no longer overlaps, instead of showing nothing', () => {
    // The selection is 10:00-10:05; the picked range starts at 11:00 - zero hits guaranteed.
    const { actions } = renderView({
      filters: ['service.name == "cart"', selectionClause],
      timeFrom: '2026-10-26T11:00:00.000Z',
      timeTo: '2026-10-26T12:00:00.000Z',
    });
    const updater = actions.updateESQLQuery.mock.lastCall?.[0] as (query: string) => string;
    expect(updater(`FROM traces-apm*\n| WHERE ${selectionClause}`)).toBe('FROM traces-apm*');
  });

  it('keeps a selection the picked time range still overlaps', () => {
    // The range starts mid-selection: results still exist, so nothing is cleared.
    const { actions } = renderView({
      filters: ['service.name == "cart"', selectionClause],
      timeFrom: '2026-10-26T10:03:00.000Z',
      timeTo: '2026-10-26T11:00:00.000Z',
    });
    expect(actions.updateESQLQuery).not.toHaveBeenCalled();
  });

  it('keeps a selection the range only just left behind, as a relative window drifts', () => {
    // The selection ends 30s before the range starts: within the grace, nothing is cleared.
    const { actions } = renderView({
      filters: ['service.name == "cart"', selectionClause],
      timeFrom: '2026-10-26T10:05:30.000Z',
      timeTo: '2026-10-26T11:00:00.000Z',
    });
    expect(actions.updateESQLQuery).not.toHaveBeenCalled();
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
    // The SET the append wrote leaves with the last map clause: the query is restored exactly.
    expect(updater(withFilter)).toBe('FROM traces-apm*');
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
      expect.objectContaining({ flattened: { 'service.name': 'cart' } }),
      // The flyout opens on the traces Overview, not the field table.
      { initialTabId: 'doc_view_obs_traces_overview' }
    );
  });

  it('gives the opened span its real identity when the metadata is there', async () => {
    jest.mocked(getESQLResults).mockResolvedValue({
      response: {
        columns: [
          { name: 'service.name', type: 'keyword' },
          { name: '_id', type: 'keyword' },
          { name: '_index', type: 'keyword' },
        ],
        values: [['cart', 'span-1', '.ds-traces-apm-000001']],
      },
    } as Awaited<ReturnType<typeof getESQLResults>>);
    const { actions, mapProps } = renderView();
    await act(() => mapProps.onCellClick!(cell));
    // The identity lets the traces document profile recognize the record, and the flyout
    // write a URL reference from raw._id/_index.
    expect(actions.setExpandedDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '.ds-traces-apm-000001::span-1::',
        raw: expect.objectContaining({ _id: 'span-1', _index: '.ds-traces-apm-000001' }),
      }),
      { initialTabId: 'doc_view_obs_traces_overview' }
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

  it('tells the map while the documents query runs, so its loading line shows', () => {
    const { mapProps } = renderView({ isChartLoading: true });
    expect(mapProps.isUpdating).toBe(true);
  });

  it('reports an idle documents query to the map', () => {
    const { mapProps } = renderView();
    expect(mapProps.isUpdating).toBeFalsy();
  });
});
