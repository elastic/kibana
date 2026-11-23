/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { BehaviorSubject, filter, first, firstValueFrom, skip } from 'rxjs';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import { dataViewsService } from '../../services/kibana_services';
import { initializeDataControlManager } from './data_control_manager';
import { initializeStateManager } from '@kbn/presentation-publishing';
import { ControlValuesSource, DEFAULT_DATA_CONTROL_STATE } from '@kbn/controls-constants';
import type { DataControlState } from '@kbn/controls-schemas';
import { getSourceFromESQLQuery } from '../utils/get_source_from_esql_query';

const mockGetESQLSingleColumnValues = jest.fn();
jest.mock('../../../common/options_list/get_esql_single_column_values', () => {
  const fn = (...args: unknown[]) => mockGetESQLSingleColumnValues(...args);
  fn.isSuccess = (result: unknown) => !!result && 'column' in (result as Record<string, unknown>);
  fn.isMultiColumnError = (result: unknown) =>
    !!result && 'columns' in (result as Record<string, unknown>);
  fn.hasNoResults = (result: unknown) =>
    fn.isSuccess(result) && !(result as { values?: unknown[] }).values?.length;
  fn.isNumericResult = () => false;
  return { getESQLSingleColumnValues: fn };
});

jest.mock('../utils/get_source_from_esql_query', () => ({
  getSourceFromESQLQuery: jest.fn(),
}));

describe('initializeDataControlManager', () => {
  const dataControlState: DataControlState = {
    ...DEFAULT_DATA_CONTROL_STATE,
    data_view_id: 'myDataViewId',
    field_name: 'myFieldName',
    values_source: ControlValuesSource.FIELD,
    esql_query: undefined as never,
    title: undefined,
  };

  dataViewsService.get = async (id: string): Promise<DataView> => {
    if (id === 'esqlDatasetId') {
      return {
        kind: 'esql',
        id,
        title: 'logs-*,logs=archive',
        fields: [],
        getFieldByName: (name: string) => ({ name, type: 'string' }),
        isTimeBased: () => false,
      } as unknown as DataView;
    }
    if (id !== 'myDataViewId' && id !== 'noFormatterSourceId') {
      throw new Error(`Simulated error: no data view found for id ${id}`);
    }
    return {
      id,
      getFieldByName: (fieldName: string) => {
        return [
          {
            displayName: 'My field name',
            name: 'myFieldName',
            type: 'string',
            toSpec: () => ({ name: 'myFieldName', type: 'string' }),
          },
        ].find((field) => fieldName === field.name);
      },
      ...(id === 'myDataViewId'
        ? {
            getFormatterForField: () => ({
              convertToText: (value: unknown) => `formatted ${value}`,
            }),
          }
        : {}),
    } as unknown as DataView;
  };

  beforeEach(() => {
    (getSourceFromESQLQuery as jest.Mock).mockImplementation(async () =>
      dataViewsService.get('myDataViewId')
    );
  });

  describe('data_view_id subscription', () => {
    describe('no blocking errors', () => {
      let dataControlManager: undefined | Awaited<ReturnType<typeof initializeDataControlManager>>;
      beforeAll((done) => {
        initializeDataControlManager({
          controlId: 'myControlId',
          controlType: 'myControlType',
          state: dataControlState,
          editorStateManager: initializeStateManager({}, {}),
          parentApi: {},
          typeDisplayName: 'My Control Type',
        }).then((controlManager) => {
          dataControlManager = controlManager;
          dataControlManager.api.defaultTitle$!.pipe(skip(1), first()).subscribe(() => {
            done();
          });
        });
      });

      test('should set data view', () => {
        const dataViews = dataControlManager!.api.dataSources$.value;
        expect(dataViews).not.toBeUndefined();
        expect(dataViews!.length).toBe(1);
        expect(dataViews![0].id).toBe('myDataViewId');
      });

      test('should format the values of the field with the formatter of the data view', () => {
        expect(dataControlManager!.api.fieldFormatter.value(5)).toBe('formatted 5');
      });

      test('should set default panel title', () => {
        const defaultPanelTitle = dataControlManager!.api.defaultTitle$!.value;
        expect(defaultPanelTitle).not.toBeUndefined();
        expect(defaultPanelTitle).toBe('My field name');
      });
    });

    describe('source without a formatter for its fields', () => {
      let dataControlManager: undefined | Awaited<ReturnType<typeof initializeDataControlManager>>;
      beforeAll((done) => {
        initializeDataControlManager({
          controlId: 'myControlId',
          controlType: 'myControlType',
          state: dataControlState,
          editorStateManager: initializeStateManager({}, {}),
          parentApi: {},
          typeDisplayName: 'My Control Type',
        }).then((controlManager) => {
          dataControlManager = controlManager;
          dataControlManager.api.defaultTitle$!.pipe(skip(1), first()).subscribe(() => {
            done();
          });
        });
      });

      test('should go back to the default formatter when the control changes to such a source', (done) => {
        expect(dataControlManager!.api.fieldFormatter.value(5)).toBe('formatted 5');
        dataControlManager!.api.fieldFormatter.pipe(skip(1), first()).subscribe(() => {
          expect(dataControlManager!.api.fieldFormatter.value(5)).toBe('5');
          done();
        });
        dataControlManager!.api.setDataViewId('noFormatterSourceId');
      });
    });

    describe('data view does not exist', () => {
      let dataControlManager: undefined | Awaited<ReturnType<typeof initializeDataControlManager>>;
      beforeAll((done) => {
        initializeDataControlManager({
          controlId: 'myControlId',
          controlType: 'myControlType',
          state: {
            ...dataControlState,
            data_view_id: 'notGonnaFindMeDataViewId',
          },
          editorStateManager: initializeStateManager({}, {}),
          parentApi: {},
          typeDisplayName: 'My Control Type',
        }).then((controlManager) => {
          dataControlManager = controlManager;
          dataControlManager.api.defaultTitle$!.pipe(first()).subscribe(() => {
            done();
          });
        });
      });

      test('should set blocking error', () => {
        const error = dataControlManager!.api.blockingError$.value;
        expect(error).not.toBeUndefined();
        expect(error!.message).toBe(
          'Simulated error: no data view found for id notGonnaFindMeDataViewId'
        );
      });

      test('should clear blocking error when valid data view id provided', (done) => {
        dataControlManager!.api.dataSources$.pipe(skip(1), first()).subscribe((dataView) => {
          expect(dataView).not.toBeUndefined();
          expect(dataControlManager!.api.blockingError$.value).toBeUndefined();
          done();
        });
        dataControlManager!.api.setDataViewId('myDataViewId');
      });
    });

    describe('field does not exist', () => {
      let dataControlManager: undefined | Awaited<ReturnType<typeof initializeDataControlManager>>;
      beforeAll((done) => {
        initializeDataControlManager({
          controlId: 'myControlId',
          controlType: 'myControlType',
          state: {
            ...dataControlState,
            field_name: 'notGonnaFindMeFieldName',
          },
          editorStateManager: initializeStateManager({}, {}),
          parentApi: {},
          typeDisplayName: 'My Control Type',
        }).then((controlManager) => {
          dataControlManager = controlManager;
          dataControlManager.api.defaultTitle$!.pipe(first()).subscribe(() => {
            done();
          });
        });
      });

      test('should set blocking error', () => {
        const error = dataControlManager!.api.blockingError$.value;
        expect(error).not.toBeUndefined();
        expect(error!.message).toBe('Could not locate field: notGonnaFindMeFieldName');
      });

      test('should clear blocking error when valid field name provided', (done) => {
        dataControlManager!.api.defaultTitle$!.pipe(skip(1), first()).subscribe((defaultTitle) => {
          expect(defaultTitle).toBe('My field name');
          expect(dataControlManager!.api.blockingError$.value).toBeUndefined();
          done();
        });
        dataControlManager!.api.setFieldName('myFieldName');
      });
    });
  });

  describe('ESQL query subscription', () => {
    const esqlState: DataControlState = {
      ...dataControlState,
      values_source: ControlValuesSource.ESQL,
      esql_query: 'FROM logs | WHERE country == ?geo_dest | KEEP myFieldName',
    };

    const variable: ESQLControlVariable = {
      key: 'geo_dest',
      value: 'US',
      type: ESQLVariableType.VALUES,
    };

    beforeEach(() => {
      mockGetESQLSingleColumnValues.mockReset();
    });

    it("forwards the parent's ESQL variables to getESQLSingleColumnValues", async () => {
      mockGetESQLSingleColumnValues.mockResolvedValue({
        values: ['US'],
        column: { name: 'myFieldName', type: 'keyword' },
      });
      const esqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([variable]);

      await initializeDataControlManager({
        controlId: 'esqlControl',
        controlType: 'esql',
        state: esqlState,
        editorStateManager: initializeStateManager({}, {}),
        parentApi: { esqlVariables$ },
        typeDisplayName: 'ES|QL Control',
      });

      // Allow the subscription's async work to flush.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockGetESQLSingleColumnValues).toHaveBeenCalledWith(
        expect.objectContaining({ esqlVariables: [variable] })
      );
    });

    it('re-derives the column when a new variable key appears in the parent', async () => {
      mockGetESQLSingleColumnValues.mockResolvedValue({
        values: ['US'],
        column: { name: 'myFieldName', type: 'keyword' },
      });
      const esqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([]);

      await initializeDataControlManager({
        controlId: 'esqlControl',
        controlType: 'esql',
        state: esqlState,
        editorStateManager: initializeStateManager({}, {}),
        parentApi: { esqlVariables$ },
        typeDisplayName: 'ES|QL Control',
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      const initialCalls = mockGetESQLSingleColumnValues.mock.calls.length;

      // Adding a new variable key must trigger a re-derivation since the query
      // referenced an unresolved parameter on the first run.
      esqlVariables$.next([variable]);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockGetESQLSingleColumnValues.mock.calls.length).toBeGreaterThan(initialCalls);
      expect(mockGetESQLSingleColumnValues).toHaveBeenLastCalledWith(
        expect.objectContaining({ esqlVariables: [variable] })
      );
    });

    it('skips re-derivation when only variable values change (same key set)', async () => {
      mockGetESQLSingleColumnValues.mockResolvedValue({
        values: ['US'],
        column: { name: 'myFieldName', type: 'keyword' },
      });
      const esqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([variable]);

      await initializeDataControlManager({
        controlId: 'esqlControl',
        controlType: 'esql',
        state: esqlState,
        editorStateManager: initializeStateManager({}, {}),
        parentApi: { esqlVariables$ },
        typeDisplayName: 'ES|QL Control',
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      const initialCalls = mockGetESQLSingleColumnValues.mock.calls.length;

      // Same key, different value — should be a no-op for column derivation.
      esqlVariables$.next([{ ...variable, value: 'CA' }]);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockGetESQLSingleColumnValues.mock.calls.length).toBe(initialCalls);
    });

    it('keeps the derived field and data view when reinitialized with the same query', async () => {
      mockGetESQLSingleColumnValues.mockResolvedValue({
        values: ['US'],
        column: { name: 'myFieldName', type: 'keyword' },
      });
      const {
        data_view_id: _dataViewId,
        field_name: _fieldName,
        ...serializedEsqlState
      } = esqlState;

      const dataControlManager = await initializeDataControlManager({
        controlId: 'esqlControl',
        controlType: 'esql',
        state: serializedEsqlState,
        editorStateManager: initializeStateManager({}, {}),
        parentApi: {},
        typeDisplayName: 'ES|QL Control',
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      dataControlManager.reinitializeState(dataControlManager.getLatestState());
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(dataControlManager.api.fieldName$.value).toBe('myFieldName');
      expect(dataControlManager.api.dataViewId$.value).toBe('myDataViewId');
    });
  });

  describe('valuesSourceFetchPlan$', () => {
    const initializeManager = (state: Partial<DataControlState>) =>
      initializeDataControlManager({
        controlId: 'myControlId',
        controlType: 'myControlType',
        state: { ...dataControlState, ...state },
        editorStateManager: initializeStateManager({}, {}),
        parentApi: {},
        typeDisplayName: 'My Control Type',
      });
    const planOf = (manager: Awaited<ReturnType<typeof initializeManager>>) =>
      firstValueFrom(manager.api.valuesSourceFetchPlan$.pipe(filter(Boolean)));

    it('is a DSL request for a field of a data view', async () => {
      expect(await planOf(await initializeManager({}))).toEqual({ fetchMode: 'dsl' });
    });

    it('is a generated ES|QL query on the FROM target for a field of an ES|QL source', async () => {
      const manager = await initializeManager({ data_view_id: 'esqlDatasetId' });

      expect(await planOf(manager)).toEqual({
        fetchMode: 'esql',
        query: 'FROM logs-*, "logs=archive"\n| STATS BY myFieldName',
      });
    });

    it('is the query of the user, never a generated one, when the values come from a query', async () => {
      // A saved control has the query and no data view or field: they are derived from the query
      const derivedSource = {
        kind: 'esql',
        id: 'derivedEsqlSourceId',
        title: 'logs-*',
        fields: [],
        getFieldByName: (name: string) => ({ name, type: 'string' }),
        isTimeBased: () => false,
      };
      (getSourceFromESQLQuery as jest.Mock).mockResolvedValue(derivedSource);
      mockGetESQLSingleColumnValues.mockResolvedValue({
        values: [],
        column: { name: 'myFieldName', type: 'keyword' },
        indexPattern: 'logs-*',
      });
      const {
        data_view_id: _dataViewId,
        field_name: _fieldName,
        ...serializedState
      } = {
        ...dataControlState,
        values_source: ControlValuesSource.ESQL,
        esql_query: 'FROM logs-* | STATS BY myFieldName',
      };

      const manager = await initializeDataControlManager({
        controlId: 'myControlId',
        controlType: 'myControlType',
        state: serializedState,
        editorStateManager: initializeStateManager({}, {}),
        parentApi: {},
        typeDisplayName: 'My Control Type',
      });

      expect(await planOf(manager)).toEqual({
        fetchMode: 'esql',
        query: 'FROM logs-* | STATS BY myFieldName',
      });
      // The source is the one derived from the query, which `dataViewsService` cannot load
      expect(manager.api.dataSources$.value?.[0]).toBe(derivedSource);
      expect(manager.api.blockingError$.value).toBeUndefined();
    });

    it('is not known while the data source cannot be loaded', async () => {
      const manager = await initializeManager({ data_view_id: 'notGonnaFindMeDataViewId' });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(manager.api.valuesSourceFetchPlan$.value).toBeUndefined();
    });
  });

  describe('source of an ES|QL values control', () => {
    const esqlSourceOf = (id: string) => ({
      kind: 'esql',
      id,
      title: 'logs-*',
      fields: [],
      getFieldByName: (name: string) => ({ name, type: 'string' }),
      isTimeBased: () => false,
    });
    const savedEsqlState = {
      ...dataControlState,
      values_source: ControlValuesSource.ESQL,
      esql_query: 'FROM logs-* | STATS BY myFieldName',
    };
    const {
      data_view_id: _dataViewId,
      field_name: _fieldName,
      ...serializedEsqlState
    } = savedEsqlState;
    const initializeEsqlManager = () =>
      initializeDataControlManager({
        controlId: 'myControlId',
        controlType: 'myControlType',
        state: serializedEsqlState,
        editorStateManager: initializeStateManager({}, {}),
        parentApi: {},
        typeDisplayName: 'My Control Type',
      });

    beforeEach(() => {
      mockGetESQLSingleColumnValues.mockResolvedValue({
        values: [],
        column: { name: 'myFieldName', type: 'keyword' },
        indexPattern: 'logs-*',
      });
    });

    it('uses the source of the query that the editor saves, with the id that only the query can resolve', async () => {
      const firstSource = esqlSourceOf('firstSourceId');
      const secondSource = esqlSourceOf('secondSourceId');
      (getSourceFromESQLQuery as jest.Mock)
        .mockResolvedValueOnce(firstSource)
        .mockResolvedValue(secondSource);
      const manager = await initializeEsqlManager();
      const errors: unknown[] = [];
      manager.api.blockingError$.subscribe((error) => error && errors.push(error));
      await firstValueFrom(manager.api.dataSources$.pipe(filter(Boolean)));
      expect(manager.api.dataSources$.value?.[0]).toBe(firstSource);

      // what the editor saves: the new query together with the id of the source that it derived
      manager.reinitializeState({
        ...manager.getLatestState(),
        esql_query: 'FROM logs-* | STATS BY other',
        data_view_id: 'secondSourceId',
      } as DataControlState);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(manager.api.dataSources$.value?.[0]).toBe(secondSource);
      // the id of a source that no data view has must not be looked up as a data view, even for a moment
      expect(errors).toEqual([]);
    });

    it('is not overwritten by the source of the query when the control goes back to field mode meanwhile', async () => {
      const esqlSource = esqlSourceOf('esqlSourceId');
      let resolveSource: (source: unknown) => void = () => {};
      (getSourceFromESQLQuery as jest.Mock).mockReturnValueOnce(
        new Promise((resolve) => (resolveSource = resolve))
      );
      const manager = await initializeEsqlManager();

      manager.api.setValuesSource(ControlValuesSource.FIELD);
      manager.api.setDataViewId('myDataViewId');
      manager.api.setFieldName('myFieldName');
      await firstValueFrom(manager.api.dataSources$.pipe(filter(Boolean)));
      resolveSource(esqlSource);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(manager.api.dataSources$.value?.[0].id).toBe('myDataViewId');
      expect(manager.api.dataViewId$.value).toBe('myDataViewId');
      expect(manager.api.fieldName$.value).toBe('myFieldName');
    });

    it('is not replaced by a data view lookup that was pending when the control switched to a query', async () => {
      const esqlSource = esqlSourceOf('esqlSourceId');
      const originalGet = dataViewsService.get;
      let resolveLookup: (dataView: DataView) => void = () => {};
      dataViewsService.get = jest
        .fn()
        .mockImplementation((id: string) =>
          id === 'slowDataViewId'
            ? new Promise((resolve) => (resolveLookup = resolve))
            : originalGet(id)
        );
      (getSourceFromESQLQuery as jest.Mock).mockResolvedValue(esqlSource);
      try {
        const manager = await initializeDataControlManager({
          controlId: 'myControlId',
          controlType: 'myControlType',
          state: { ...dataControlState, data_view_id: 'slowDataViewId' },
          editorStateManager: initializeStateManager({}, {}),
          parentApi: {},
          typeDisplayName: 'My Control Type',
        });

        manager.api.setEsqlQuery('FROM logs-* | STATS BY myFieldName');
        manager.api.setValuesSource(ControlValuesSource.ESQL);
        await firstValueFrom(manager.api.dataSources$.pipe(filter(Boolean)));
        resolveLookup(await originalGet('myDataViewId'));
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(manager.api.dataSources$.value?.[0]).toBe(esqlSource);
        expect(manager.api.blockingError$.value).toBeUndefined();
      } finally {
        dataViewsService.get = originalGet;
      }
    });

    it('applies only the latest query when an earlier one finishes last', async () => {
      const firstSource = esqlSourceOf('firstSourceId');
      const secondSource = esqlSourceOf('secondSourceId');
      let resolveFirst: (source: unknown) => void = () => {};
      (getSourceFromESQLQuery as jest.Mock)
        .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
        .mockResolvedValue(secondSource);
      const manager = await initializeEsqlManager();

      manager.api.setEsqlQuery('FROM logs-* | STATS BY other');
      await firstValueFrom(manager.api.dataSources$.pipe(filter(Boolean)));
      resolveFirst(firstSource);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(manager.api.dataSources$.value?.[0]).toBe(secondSource);
    });
  });
});
