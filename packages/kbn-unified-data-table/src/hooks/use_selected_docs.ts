/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';

export interface UseSelectedDocsState {
  isDocSelected: (docId: string) => boolean;
  isIndeterminate: boolean;
  hasSelectedDocs: boolean;
  usedSelectedDocs: string[];
  toggleDocSelection: (docId: string) => void;
  selectAllDocs: () => void;
  replaceSelectedDocs: (docIds: string[]) => void;
  clearSelectedDocs: () => void;
}

export const useSelectedDocs = (docMap: Map<string, DataTableRecord>): UseSelectedDocsState => {
  const [selectedDocsSet, setSelectedDocsSet] = useState<Set<string>>(new Set());

  const toggleDocSelection = useCallback((docId: string) => {
    setSelectedDocsSet((prevSelectedRowsSet) => {
      const newSelectedRowsSet = new Set(prevSelectedRowsSet);
      if (newSelectedRowsSet.has(docId)) {
        newSelectedRowsSet.delete(docId);
      } else {
        newSelectedRowsSet.add(docId);
      }
      return newSelectedRowsSet;
    });
  }, []);

  const replaceSelectedDocs = useCallback((docIds: string[]) => {
    setSelectedDocsSet(new Set(docIds));
  }, []);

  const selectAllDocs = useCallback(() => {
    setSelectedDocsSet(new Set(docMap.keys()));
  }, [docMap]);

  const clearSelectedDocs = useCallback(() => {
    setSelectedDocsSet(new Set());
  }, []);

  const usedSelectedDocs = useMemo(
    () => Array.from(selectedDocsSet).filter((docId) => docMap.has(docId)),
    [selectedDocsSet, docMap]
  );

  const isDocSelected = useCallback(
    (docId: string) => selectedDocsSet.has(docId) && docMap.has(docId),
    [selectedDocsSet, docMap]
  );

  const usedSelectedDocsCount = usedSelectedDocs.length;
  const totalDocsCount = docMap.size;
  const isIndeterminate = useMemo(
    () => usedSelectedDocsCount > 0 && usedSelectedDocsCount < totalDocsCount,
    [usedSelectedDocsCount, totalDocsCount]
  );

  return useMemo(
    () => ({
      isDocSelected,
      isIndeterminate,
      hasSelectedDocs: usedSelectedDocsCount > 0,
      usedSelectedDocs,
      toggleDocSelection,
      selectAllDocs,
      replaceSelectedDocs,
      clearSelectedDocs,
    }),
    [
      isDocSelected,
      isIndeterminate,
      toggleDocSelection,
      selectAllDocs,
      replaceSelectedDocs,
      clearSelectedDocs,
      usedSelectedDocsCount,
      usedSelectedDocs,
    ]
  );
};
