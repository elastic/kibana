/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { ControlValuesSource } from '@kbn/controls-constants';
import { EsqlSource } from '@kbn/data-source';
import type { DataView } from '@kbn/data-views-plugin/common';
import { coreServices, dataViewsService } from '../../services/kibana_services';
import { resolveControlSource, toControlSourceDescriptor } from './control_source';

describe('control source', () => {
  const dataView = { id: 'myDataViewId' } as DataView;
  const esqlSource = { kind: 'esql' } as EsqlSource;
  const mockForDataset = jest.spyOn(EsqlSource, 'forDataset');

  beforeEach(() => {
    jest.clearAllMocks();
    dataViewsService.get = jest.fn().mockResolvedValue(dataView);
    mockForDataset.mockResolvedValue(esqlSource);
  });

  it('describes a field control by its data view and a query control by its query', () => {
    expect(
      toControlSourceDescriptor({
        values_source: ControlValuesSource.FIELD,
        data_view_id: 'myDataViewId',
        esql_query: 'FROM logs',
      })
    ).toEqual({ kind: 'dataView', dataViewId: 'myDataViewId' });
    expect(
      toControlSourceDescriptor({
        values_source: ControlValuesSource.ESQL,
        data_view_id: 'derivedDataViewId',
        esql_query: 'FROM logs | STATS BY os',
      })
    ).toEqual({ kind: 'esql', query: 'FROM logs | STATS BY os' });
  });

  it('resolves a data view by its id, without reading any query', async () => {
    const source = await resolveControlSource({ kind: 'dataView', dataViewId: 'myDataViewId' });

    expect(source.kind === 'index-pattern' && source.getDataView()).toBe(dataView);
    expect(dataViewsService.get).toHaveBeenCalledWith('myDataViewId');
    expect(mockForDataset).not.toHaveBeenCalled();
  });

  it('resolves a query to an ES|QL source of what it reads, with no data view', async () => {
    const parentApi = { projectRouting$: new BehaviorSubject<string | undefined>('_alias:*') };

    expect(
      await resolveControlSource({ kind: 'esql', query: 'FROM logs | STATS BY os' }, { parentApi })
    ).toBe(esqlSource);
    expect(mockForDataset).toHaveBeenCalledWith({
      query: 'FROM logs | STATS BY os',
      http: coreServices.http,
      projectRouting: '_alias:*',
    });
    expect(dataViewsService.get).not.toHaveBeenCalled();
  });

  it('fails for a query control without a query', async () => {
    await expect(resolveControlSource({ kind: 'esql', query: '' })).rejects.toThrow(
      'Variable control is missing a query'
    );
  });
});
