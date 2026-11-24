/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useProfileAccessor } from '../../../../context_awareness';
import { FetchStatus } from '../../../types';
import type {
  DataDocuments$,
  DataMain$,
} from '../../state_management/discover_data_state_container';
import {
  sendCompleteMsg,
  sendErrorMsg,
  sendPartialMsg,
} from '../../hooks/use_saved_search_messages';
import {
  getMainStatusAfterDocumentsError,
  type ChartOutcome,
} from '../../utils/get_main_status_after_documents_error';

/**
 * Reports the outcome of the ES|QL chart to `main$`: hides the loading overlay once the chart has
 * results and decides what to show if the documents failed. The returned function returns `false`
 * if the chart belongs to an older or aborted fetch.
 */
export const useChartOutcome = ({
  main$,
  documents$,
  getAbortController,
  isEsqlMode,
}: {
  main$: DataMain$;
  documents$: DataDocuments$;
  getAbortController: () => AbortController | undefined;
  isEsqlMode: boolean;
}) => {
  const getChartConfigAccessor = useProfileAccessor('getChartSectionConfiguration');
  const canChartLoadFirst = useMemo(() => {
    const config = getChartConfigAccessor(() => ({ replaceDefaultChart: false }))();
    // sections that never report back would keep the overlay forever
    return !config.replaceDefaultChart || config.reportsChartLoaded === true;
  }, [getChartConfigAccessor]);

  const outcomeRef = useRef<{ fetch: AbortController; outcome: ChartOutcome }>();

  // fetchAll leaves main$ alone if documents fail while the chart is pending, finish it here
  const finishMainAfterDocumentsError = useCallback(() => {
    const { fetchStatus: documentsStatus, error } = documents$.getValue();
    const current = outcomeRef.current;
    const nextStatus = getMainStatusAfterDocumentsError({
      documentsStatus,
      mainStatus: main$.getValue().fetchStatus,
      chartOutcome: current && current.fetch === getAbortController() ? current.outcome : 'pending',
      canChartLoadFirst,
    });

    if (nextStatus === FetchStatus.ERROR) {
      sendErrorMsg(main$, error);
    } else if (nextStatus === FetchStatus.COMPLETE) {
      sendCompleteMsg(main$);
    }
  }, [documents$, main$, getAbortController, canChartLoadFirst]);

  // documents can fail after the chart outcome is known
  useEffect(() => {
    if (!isEsqlMode) return;
    const subscription = documents$.subscribe(finishMainAfterDocumentsError);
    return () => subscription.unsubscribe();
  }, [isEsqlMode, documents$, finishMainAfterDocumentsError]);

  return useCallback(
    (fetch: AbortController | undefined, outcome: 'loaded' | 'empty'): boolean => {
      // ignore charts of older or aborted fetches
      if (!fetch || fetch.signal.aborted || fetch !== getAbortController()) {
        return false;
      }

      outcomeRef.current = { fetch, outcome };
      if (outcome === 'loaded') {
        // hide the overlay while documents keep loading
        sendPartialMsg(main$);
      }
      finishMainAfterDocumentsError();
      return true;
    },
    [getAbortController, main$, finishMainAfterDocumentsError]
  );
};
