/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';
import { BehaviorSubject, Subject } from 'rxjs';
import { ControlValuesSource } from '@kbn/controls-constants';

import { coreServices } from '../../../services/kibana_services';
import { setStubKibanaServices } from '../../../services/mocks';
import { fetchAndValidate$ } from './fetch_and_validate';

const mockGetESQLResults = jest.fn();
jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLResults: (...args: unknown[]) => mockGetESQLResults(...args),
}));

const phraseFilter = (field: string, value: string) =>
  ({
    meta: { type: 'phrase', key: field, params: { query: value } },
    query: { match_phrase: { [field]: value } },
  } as any);

const buildApi = ({
  filters$,
  parentQuery$,
  projectRouting$,
}: {
  filters$: BehaviorSubject<unknown>;
  parentQuery$: BehaviorSubject<unknown>;
  projectRouting$?: BehaviorSubject<string | undefined>;
}) => {
  const parentApi = {
    filters$,
    query$: parentQuery$,
    timeRange$: new BehaviorSubject({ from: 'now-15m', to: 'now' }),
    ...(projectRouting$ ? { projectRouting$ } : {}),
  };
  return {
    parentApi,
    uuid: 'test-uuid',
    loadMoreSubject: new Subject<void>(),
    loadingSuggestions$: new BehaviorSubject<boolean>(false),
    debouncedSearchString: new BehaviorSubject<string>(''),
    dataSources$: new BehaviorSubject<unknown>(undefined),
    field$: new BehaviorSubject<unknown>(undefined),
    esqlQuery$: new BehaviorSubject<string>('FROM logs | KEEP host'),
    valuesSource$: new BehaviorSubject<ControlValuesSource>(ControlValuesSource.ESQL),
    useGlobalFilters$: new BehaviorSubject<boolean>(true),
    ignoreValidations$: new BehaviorSubject<boolean>(false),
  } as any;
};

describe('fetchAndValidate$ ES|QL filter wiring', () => {
  let fetchSpy: jest.SpyInstance;

  beforeAll(() => {
    setStubKibanaServices();
  });

  beforeEach(() => {
    fetchSpy = jest.spyOn(coreServices.http, 'fetch').mockResolvedValue({
      suggestions: [],
      totalCardinality: 0,
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('refetches with the new pre-filter when dashboard filters change', async () => {
    const filters$ = new BehaviorSubject<unknown>([]);
    const parentQuery$ = new BehaviorSubject<unknown>(undefined);
    const api = buildApi({ filters$, parentQuery$ });

    const requestSize$ = new BehaviorSubject<number>(10);
    const runPastTimeout$ = new BehaviorSubject<boolean>(false);
    const selectedOptions$ = new BehaviorSubject<unknown[]>([]);
    const searchTechnique$ = new BehaviorSubject<'wildcard' | 'prefix' | 'exact'>('wildcard');
    const sort$ = new BehaviorSubject<unknown>({ by: '_count', direction: 'desc' });

    const { suggestions$ } = fetchAndValidate$({
      api,
      requestSize$: requestSize$ as any,
      runPastTimeout$: runPastTimeout$ as any,
      selectedOptions$: selectedOptions$ as any,
      searchTechnique$: searchTechnique$ as any,
      sort$: sort$ as any,
    });
    const subscription = suggestions$.subscribe(() => {});

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const firstBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(firstBody.filter).toBeUndefined();

    filters$.next([phraseFilter('host', 'mainframe')]);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(secondBody.filter).toBeDefined();
    expect(JSON.stringify(secondBody.filter)).toContain('mainframe');

    subscription.unsubscribe();
  }, 10000);

  it('runs an ES|QL query from the browser for a field of an ES|QL source', async () => {
    const api = buildApi({
      filters$: new BehaviorSubject<unknown>([]),
      parentQuery$: new BehaviorSubject<unknown>(undefined),
    });
    const field = { name: 'host', type: 'string', aggregatable: true };
    api.valuesSource$.next(ControlValuesSource.FIELD);
    api.dataSources$.next([
      {
        kind: 'esql',
        id: 'dataset-id',
        title: 'logs-*',
        fields: [field],
        getFieldByName: () => field,
        isTimeBased: () => false,
      },
    ]);
    api.field$.next(field);
    mockGetESQLResults.mockResolvedValue({
      response: { columns: [{ name: 'host', type: 'keyword' }], values: [['mainframe']] },
    });
    const emitted: unknown[] = [];

    const { suggestions$ } = fetchAndValidate$({
      api,
      requestSize$: new BehaviorSubject<number>(10) as any,
      runPastTimeout$: new BehaviorSubject<boolean>(false) as any,
      selectedOptions$: new BehaviorSubject<unknown[]>([]) as any,
      searchTechnique$: new BehaviorSubject<'wildcard' | 'prefix' | 'exact'>('wildcard') as any,
      sort$: new BehaviorSubject<unknown>({ by: '_key', direction: 'asc' }) as any,
    });
    const subscription = suggestions$.subscribe((result) => emitted.push(result));

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery: 'FROM logs-* | STATS BY host',
        signal: expect.any(AbortSignal),
      })
    );
    expect(emitted).toContainEqual(
      expect.objectContaining({ suggestions: [{ value: 'mainframe' }] })
    );
    subscription.unsubscribe();
  }, 10000);

  it('forwards the parent CPS project routing into the fetch request body', async () => {
    const filters$ = new BehaviorSubject<unknown>([]);
    const parentQuery$ = new BehaviorSubject<unknown>(undefined);
    const projectRouting$ = new BehaviorSubject<string | undefined>('_alias:*');
    const api = buildApi({ filters$, parentQuery$, projectRouting$ });

    const requestSize$ = new BehaviorSubject<number>(10);
    const runPastTimeout$ = new BehaviorSubject<boolean>(false);
    const selectedOptions$ = new BehaviorSubject<unknown[]>([]);
    const searchTechnique$ = new BehaviorSubject<'wildcard' | 'prefix' | 'exact'>('wildcard');
    const sort$ = new BehaviorSubject<unknown>({ by: '_count', direction: 'desc' });

    const { suggestions$ } = fetchAndValidate$({
      api,
      requestSize$: requestSize$ as any,
      runPastTimeout$: runPastTimeout$ as any,
      selectedOptions$: selectedOptions$ as any,
      searchTechnique$: searchTechnique$ as any,
      sort$: sort$ as any,
    });
    const subscription = suggestions$.subscribe(() => {});

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.projectRouting).toBe('_alias:*');

    subscription.unsubscribe();
  }, 10000);

  describe('cancellation', () => {
    let filters$: BehaviorSubject<unknown>;
    let cancelRequests: () => void;
    let subscription: Subscription;

    beforeEach(async () => {
      filters$ = new BehaviorSubject<unknown>([]);
      const parentQuery$ = new BehaviorSubject<unknown>(undefined);
      const api = buildApi({ filters$, parentQuery$ });

      const requestSize$ = new BehaviorSubject<number>(10);
      const runPastTimeout$ = new BehaviorSubject<boolean>(false);
      const selectedOptions$ = new BehaviorSubject<unknown[]>([]);
      const searchTechnique$ = new BehaviorSubject<'wildcard' | 'prefix' | 'exact'>('wildcard');
      const sort$ = new BehaviorSubject<unknown>({ by: '_count', direction: 'desc' });

      const result = fetchAndValidate$({
        api,
        requestSize$: requestSize$ as any,
        runPastTimeout$: runPastTimeout$ as any,
        selectedOptions$: selectedOptions$ as any,
        searchTechnique$: searchTechnique$ as any,
        sort$: sort$ as any,
      });

      cancelRequests = result.cancelRequests;
      subscription = result.suggestions$.subscribe(() => {});

      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    afterEach(() => {
      subscription.unsubscribe();
    });

    it('should pass AbortSignal to HTTP fetch', () => {
      expect(fetchSpy).toHaveBeenCalled();
      const fetchOptions = fetchSpy.mock.calls[0][1];
      expect(fetchOptions.signal).toBeInstanceOf(AbortSignal);
      expect(fetchOptions.signal.aborted).toBe(false);
    });

    it('should abort previous request when new request starts', async () => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const firstSignal: AbortSignal = fetchSpy.mock.calls[0][1].signal;
      expect(firstSignal.aborted).toBe(false);

      filters$.next([phraseFilter('host', 'mainframe')]);
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(firstSignal.aborted).toBe(true);
    }, 10000);

    it('cancelRequests() should abort in-flight request', () => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const signal: AbortSignal = fetchSpy.mock.calls[0][1].signal;
      expect(signal.aborted).toBe(false);

      cancelRequests();
      expect(signal.aborted).toBe(true);
    });
  });
});
