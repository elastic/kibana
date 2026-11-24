/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FetchStatus } from '../../types';

/** `empty`: no results, failed, or no chart at all */
export type ChartOutcome = 'pending' | 'loaded' | 'empty';

/**
 * Decides what main$ becomes after the documents failed, `undefined` keeps it as is
 * (e.g. while waiting for the chart).
 */
export const getMainStatusAfterDocumentsError = ({
  documentsStatus,
  mainStatus,
  chartOutcome,
  canChartLoadFirst,
}: {
  documentsStatus: FetchStatus;
  mainStatus: FetchStatus;
  chartOutcome: ChartOutcome;
  /** false for custom chart sections that never report back */
  canChartLoadFirst: boolean;
}): FetchStatus.ERROR | FetchStatus.COMPLETE | undefined => {
  if (documentsStatus !== FetchStatus.ERROR) {
    return undefined;
  }

  const isMainLoading = mainStatus === FetchStatus.LOADING;
  if (isMainLoading && (!canChartLoadFirst || chartOutcome === 'empty')) {
    // nothing to show but the error
    return FetchStatus.ERROR;
  }

  if (mainStatus === FetchStatus.PARTIAL && chartOutcome === 'loaded') {
    // chart is shown, nothing else finishes main$
    return FetchStatus.COMPLETE;
  }

  return undefined;
};
