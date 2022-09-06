/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useRef, useEffect, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { AvailableFields$, DataDocuments$ } from './use_saved_search';
import { FetchStatus } from '../../types';
import { calcFieldCounts } from '../utils/calc_field_counts';

interface Props {
  documents$: DataDocuments$;
  availableFields$: AvailableFields$;
  selectedDataView?: DataView;
  columns: string[];
}

/*
 * Communicates with Observables to obtain a suitable set of data for the presentational sidebar component.
 */
export const useSidebarData = ({
  documents$,
  availableFields$,
  selectedDataView,
  columns,
}: Props) => {
  const [documentState, setDocumentState] = useState(documents$.getValue());

  /**
   * fieldCounts are used to determine which fields are actually used in the given set of documents
   */
  const fieldCounts = useRef<Record<string, number> | null>(null);

  if (fieldCounts.current === null) {
    fieldCounts.current = calcFieldCounts(documents$.getValue().result!, selectedDataView);
  }

  useEffect(() => {
    const subscription = documents$.subscribe((next) => {
      if (next.fetchStatus !== documentState.fetchStatus) {
        if (next.result) {
          fieldCounts.current = calcFieldCounts(next.result, selectedDataView!);
        }
        setDocumentState({ ...documentState, ...next });
      }
    });
    return () => subscription.unsubscribe();
  }, [documents$, selectedDataView, documentState, setDocumentState]);

  useEffect(() => {
    // when index pattern changes fieldCounts needs to be cleaned up to prevent displaying
    // fields of the previous index pattern
    fieldCounts.current = {};
  }, [selectedDataView]);

  useEffect(
    () => {
      // For an external embeddable like the Field stats
      // it is useful to know what fields are populated in the docs fetched
      // or what fields are selected by the user

      const fieldCnts = fieldCounts.current ?? {};

      const availableFields = columns.length > 0 ? columns : Object.keys(fieldCnts);
      availableFields$.next({
        fetchStatus: FetchStatus.COMPLETE,
        fields: availableFields,
      });
    },
    // Using columns.length here instead of columns to avoid array reference changing
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDataView, availableFields$, fieldCounts.current, documentState.result, columns.length]
  );

  return {
    fieldCounts: fieldCounts.current,
    documents: documentState.result,
  };
};
