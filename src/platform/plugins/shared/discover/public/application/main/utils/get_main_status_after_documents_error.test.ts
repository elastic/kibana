/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FetchStatus } from '../../types';
import {
  getMainStatusAfterDocumentsError,
  type ChartOutcome,
} from './get_main_status_after_documents_error';

describe('getMainStatusAfterDocumentsError', () => {
  const run = (
    mainStatus: FetchStatus,
    chartOutcome: ChartOutcome,
    overrides: { documentsStatus?: FetchStatus; canChartLoadFirst?: boolean } = {}
  ) =>
    getMainStatusAfterDocumentsError({
      documentsStatus: FetchStatus.ERROR,
      canChartLoadFirst: true,
      mainStatus,
      chartOutcome,
      ...overrides,
    });

  it('keeps main$ if the documents did not fail', () => {
    expect(run(FetchStatus.LOADING, 'empty', { documentsStatus: FetchStatus.LOADING })).toBe(
      undefined
    );
  });

  it('waits for a pending chart', () => {
    expect(run(FetchStatus.LOADING, 'pending')).toBe(undefined);
  });

  it('errors main$ if the chart has no results', () => {
    expect(run(FetchStatus.LOADING, 'empty')).toBe(FetchStatus.ERROR);
  });

  it('errors main$ if the chart section never reports back', () => {
    expect(run(FetchStatus.LOADING, 'pending', { canChartLoadFirst: false })).toBe(
      FetchStatus.ERROR
    );
  });

  it('completes main$ if the chart is displayed', () => {
    expect(run(FetchStatus.PARTIAL, 'loaded')).toBe(FetchStatus.COMPLETE);
  });

  it('keeps a main$ that is already finished', () => {
    expect(run(FetchStatus.ERROR, 'empty')).toBe(undefined);
    expect(run(FetchStatus.COMPLETE, 'loaded')).toBe(undefined);
  });
});
