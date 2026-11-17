/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { VegaByValueState } from './schema';
import { getTransforms, type StoredVegaState } from './transforms';

const drilldownReference: SavedObjectReference = {
  name: 'drilldown_0',
  type: 'dashboard',
  id: 'target-dashboard',
};

const drilldownTransforms = {
  transformIn: jest.fn((state: VegaByValueState) => ({
    state,
    references: state.drilldowns?.length ? [drilldownReference] : [],
  })),
  transformOut: jest.fn((state: StoredVegaState) => state),
} as unknown as DrilldownTransforms;

const spec: VegaByValueState['spec'] = { format: 'hjson', value: '{ mark: point }' };

const panelFilter: NonNullable<VegaByValueState['filters']>[number] = {
  type: 'condition',
  data_view_id: 'logs-data-view',
  condition: { field: 'status', operator: 'is', value: 'active' },
};

describe('Vega embeddable transforms', () => {
  const logger = loggingSystemMock.createLogger();
  const { transformIn, transformOut } = getTransforms(drilldownTransforms, logger);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('moves panel filter data views into references and restores them on read', () => {
    const query: VegaByValueState['query'] = { language: 'kql', expression: 'bytes > 1000' };
    const { state: storedState, references } = transformIn({
      spec,
      query,
      filters: [panelFilter],
    } as VegaByValueState);

    expect(references).toEqual([
      {
        name: 'filters[0].data_view_id',
        type: 'index-pattern',
        id: 'logs-data-view',
      },
    ]);
    expect(storedState.filters?.[0]).not.toHaveProperty('data_view_id');
    expect(storedState.filters?.[0]).toHaveProperty(
      'data_view_ref_name',
      'filters[0].data_view_id'
    );
    expect(storedState.query).toEqual(query);

    const renamedReferences = references.map((reference) => ({
      ...reference,
      id: 'imported-data-view',
    }));
    const apiState = transformOut(storedState, renamedReferences);

    expect(apiState.filters).toEqual([{ ...panelFilter, data_view_id: 'imported-data-view' }]);
    expect(apiState.query).toEqual(query);
  });

  it('keeps drilldown references alongside filter references', () => {
    const { references } = transformIn({
      spec,
      filters: [panelFilter],
      drilldowns: [{ type: 'dashboard_drilldown' }],
    } as unknown as VegaByValueState);

    expect(references).toEqual([
      drilldownReference,
      expect.objectContaining({ type: 'index-pattern', id: 'logs-data-view' }),
    ]);
  });

  it('passes panels without filters through unchanged', () => {
    const { state: storedState, references } = transformIn({ spec } as VegaByValueState);

    expect(references).toEqual([]);
    expect(storedState.filters).toBeUndefined();
    expect(transformOut(storedState, references)).toEqual(expect.objectContaining({ spec }));
    expect(transformOut(storedState, references).filters).toBeUndefined();
  });

  it('keeps filters and logs a warning when a filter reference is missing', () => {
    const { state: storedState } = transformIn({
      spec,
      filters: [panelFilter],
    } as VegaByValueState);

    const apiState = transformOut(storedState, []);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unable to transform filter and query state on read')
    );
    expect(apiState.filters).toHaveLength(1);
    expect(apiState.filters?.[0]).toEqual(
      expect.objectContaining({ condition: panelFilter.condition })
    );
    expect(apiState.filters?.[0]).not.toHaveProperty('data_view_ref_name');
  });
});
