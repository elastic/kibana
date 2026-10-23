/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import {
  PATTERNS_HISTOGRAM_COMPARISON_STATE_DEFAULTS,
  type PatternsHistogramComparisonState,
} from '../../../../../common/context_awareness';
import type { ContextAwarenessToolkit } from '../../../toolkit';
import {
  createPatternsHistogramComparison,
  getComparableCategorizeColumn,
  publishPatternsHistogramComparison,
} from './histogram_comparison';

const dataView = createStubDataView({ spec: {} });
const query = {
  esql: 'FROM logs | STATS count = COUNT(*) BY CATEGORIZE(message)',
};

const createToolkit = () => {
  const state$ = new BehaviorSubject<PatternsHistogramComparisonState>(
    PATTERNS_HISTOGRAM_COMPARISON_STATE_DEFAULTS
  );
  const toolkit = {
    getStateAdapter: () => ({
      getState: () => state$.getValue(),
      getState$: () => state$,
      setState: (state: PatternsHistogramComparisonState) => state$.next(state),
      updateState: (update: Partial<PatternsHistogramComparisonState>) =>
        state$.next({ ...state$.getValue(), ...update }),
    }),
  } as unknown as ContextAwarenessToolkit;

  return { toolkit, state$ };
};

describe('patterns histogram comparison', () => {
  it('accepts exactly one CATEGORIZE grouping', () => {
    expect(getComparableCategorizeColumn(query.esql)).toBe('CATEGORIZE(message)');
    expect(
      getComparableCategorizeColumn(
        'FROM logs | STATS count = COUNT(*) BY CATEGORIZE(message), host'
      )
    ).toBeUndefined();
    expect(getComparableCategorizeColumn('FROM logs | STATS count = COUNT(*)')).toBeUndefined();
  });

  it('stores one document query and drops it when the source query changes', async () => {
    const { toolkit, state$ } = createToolkit();
    const published = publishPatternsHistogramComparison(toolkit, {
      label: '.*?Failed login for .+? from .+?',
      column: 'CATEGORIZE(message)',
      value: '.*?Failed login for .+? from .+?',
      query,
      dataView,
    });

    expect(published).toBe(true);
    expect(state$.getValue().documentQuery).toContain('RLIKE');
    expect(state$.getValue().value).toBe('.*?Failed login for .+? from .+?');

    const controller = createPatternsHistogramComparison(toolkit, {
      query,
      defaultHistogramAvailable: true,
    });
    const selection = await firstValueFrom(controller.selection$);
    expect(selection?.documentQuery).toContain('MATCH');

    controller.onResult({ key: selection!.key, status: 'applied' });
    expect(state$.getValue().resultStatus).toBe('applied');

    controller.onResult({ key: 'someone-else', status: 'unavailable' });
    expect(state$.getValue().resultStatus).toBe('applied');

    publishPatternsHistogramComparison(toolkit, {
      label: '.*?Failed login for .+? from .+?',
      column: 'CATEGORIZE(message)',
      value: '.*?Failed login for .+? from .+?',
      query,
      dataView,
    });
    expect(state$.getValue().resultStatus).toBe('applied');

    const stale = createPatternsHistogramComparison(toolkit, {
      query: { esql: 'FROM logs | STATS count = COUNT(*) BY CATEGORIZE(other)' },
      defaultHistogramAvailable: true,
    });
    expect(await firstValueFrom(stale.selection$)).toBeUndefined();
  });

  it('clears the selection and lets the next profile handle an empty publication', () => {
    const { toolkit, state$ } = createToolkit();
    publishPatternsHistogramComparison(toolkit, {
      label: '.*?Failed login.*?',
      column: 'CATEGORIZE(message)',
      value: '.*?Failed login.*?',
      query,
      dataView,
    });

    expect(publishPatternsHistogramComparison(toolkit, undefined)).toBe(false);
    expect(state$.getValue()).toEqual(PATTERNS_HISTOGRAM_COMPARISON_STATE_DEFAULTS);
  });
});
