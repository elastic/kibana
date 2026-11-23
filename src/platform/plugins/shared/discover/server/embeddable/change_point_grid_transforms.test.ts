/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ChangePointGridEmbeddableState } from './change_point_grid_schema';
import {
  CHANGE_POINT_GRID_CONFIG_DATA_VIEW_REF_NAME,
  getChangePointGridTransforms,
} from './change_point_grid_transforms';

const esql = 'FROM logs-* | CHANGE_POINT count ON @timestamp';

type PanelFilter = NonNullable<
  NonNullable<ChangePointGridEmbeddableState['static_context']>['filters']
>[number];

const panelFilter: PanelFilter = {
  type: 'condition',
  data_view_id: 'logs-data-view',
  condition: { field: 'status', operator: 'is', value: 'active' },
};

const staticPanel = (filters?: PanelFilter[]): ChangePointGridEmbeddableState => ({
  esql,
  apply_dashboard_context: false,
  time_range: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' },
  static_context: {
    query: { expression: 'bytes > 1000', language: 'kql' },
    ...(filters ? { filters } : {}),
  },
});

describe('change point grid embeddable transforms', () => {
  const logger = loggingSystemMock.createLogger();
  const { transformIn, transformOut } = getChangePointGridTransforms(logger);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('moves static filter data views into references and restores them on read', () => {
    const { state: storedState, references } = transformIn(staticPanel([panelFilter]));

    expect(references).toEqual([
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
        type: 'index-pattern',
        id: 'logs-data-view',
      },
    ]);
    expect(storedState.static_context?.filters?.[0].meta.index).toBeUndefined();
    expect(storedState.static_context?.filters?.[0].meta).toHaveProperty(
      'indexRefName',
      'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index'
    );
    expect(storedState.static_context?.query).toEqual({
      expression: 'bytes > 1000',
      language: 'kql',
    });

    const renamedReferences = references.map((reference) => ({
      ...reference,
      id: 'imported-data-view',
    }));
    const apiState = transformOut(storedState, renamedReferences);

    expect(apiState.static_context?.filters).toEqual([
      { ...panelFilter, data_view_id: 'imported-data-view' },
    ]);
    expect(apiState.static_context?.query).toEqual({
      expression: 'bytes > 1000',
      language: 'kql',
    });
  });

  it('passes a following panel through unchanged', () => {
    const state: ChangePointGridEmbeddableState = {
      esql,
      apply_dashboard_context: true,
    };
    const { state: storedState, references } = transformIn(state);

    expect(references).toEqual([]);
    expect(storedState).toEqual(state);
    expect(transformOut(storedState, references)).toEqual(state);
  });

  it('passes a static panel without filters through unchanged', () => {
    const state = staticPanel();
    const { state: storedState, references } = transformIn(state);

    expect(references).toEqual([]);
    expect(storedState.static_context?.filters).toBeUndefined();
    expect(transformOut(storedState, references)).toEqual(state);
  });

  it('keeps filters and logs a warning when a filter reference is missing', () => {
    const { state: storedState } = transformIn(staticPanel([panelFilter]));

    const apiState = transformOut(storedState, []);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unable to inject change point grid panel filter references')
    );
    expect(apiState.static_context?.filters).toHaveLength(1);
    expect(apiState.static_context?.filters?.[0]).toEqual(
      expect.objectContaining({ condition: panelFilter.condition })
    );
  });

  it('moves form configuration data_view_id into references and restores a remapped reference on read', () => {
    const state: ChangePointGridEmbeddableState = {
      esql,
      apply_dashboard_context: true,
      configuration: {
        mode: 'form',
        data_view_id: 'logs-data-view',
        aggregation_function: 'avg',
        metric_field: 'bytes',
        split_field: 'host.name',
        partitions: ['web-1'],
      },
    };

    const { state: storedState, references } = transformIn(state);

    expect(references).toEqual([
      {
        name: CHANGE_POINT_GRID_CONFIG_DATA_VIEW_REF_NAME,
        type: 'index-pattern',
        id: 'logs-data-view',
      },
    ]);
    expect(storedState.configuration).toEqual({
      mode: 'form',
      aggregation_function: 'avg',
      metric_field: 'bytes',
      split_field: 'host.name',
      partitions: ['web-1'],
    });
    expect(storedState.configuration).not.toHaveProperty('data_view_id');

    const apiState = transformOut(storedState, [
      {
        name: CHANGE_POINT_GRID_CONFIG_DATA_VIEW_REF_NAME,
        type: 'index-pattern',
        id: 'imported-data-view',
      },
    ]);

    expect(apiState.configuration).toEqual({
      mode: 'form',
      data_view_id: 'imported-data-view',
      aggregation_function: 'avg',
      metric_field: 'bytes',
      split_field: 'host.name',
      partitions: ['web-1'],
    });
  });

  it('passes direct-ES|QL configuration through without adding references and degrades safely if a form reference is missing', () => {
    const directState: ChangePointGridEmbeddableState = {
      esql,
      apply_dashboard_context: true,
      configuration: { mode: 'esql' },
    };
    const { state: storedDirect, references: directReferences } = transformIn(directState);
    expect(directReferences).toEqual([]);
    expect(storedDirect).toEqual(directState);
    expect(transformOut(storedDirect, [])).toEqual(directState);

    const { state: storedForm } = transformIn({
      esql,
      apply_dashboard_context: true,
      configuration: {
        mode: 'form',
        data_view_id: 'logs-data-view',
        aggregation_function: 'avg',
        metric_field: 'bytes',
      },
    });
    const degraded = transformOut(storedForm, []);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unable to inject change point grid panel configuration data view')
    );
    expect(degraded.configuration).toEqual({ mode: 'esql' });
  });
});
