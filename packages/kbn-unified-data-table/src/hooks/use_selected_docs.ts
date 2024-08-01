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
  getCountOfSelectedDocs: (docIds: string[]) => number;
  hasSelectedDocs: boolean;
  selectedDocIds: string[];
  toggleDocSelection: (docId: string) => void;
  selectAllDocs: () => void;
  selectMoreDocs: (docIds: string[]) => void;
  deselectSomeDocs: (docIds: string[]) => void;
  replaceSelectedDocs: (docIds: string[]) => void;
  clearAllSelectedDocs: () => void;
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

  const selectMoreDocs = useCallback((docIds: string[]) => {
    setSelectedDocsSet((prevSelectedRowsSet) => new Set([...prevSelectedRowsSet, ...docIds]));
  }, []);

  const deselectSomeDocs = useCallback((docIds: string[]) => {
    setSelectedDocsSet(
      (prevSelectedRowsSet) =>
        new Set([...prevSelectedRowsSet].filter((docId) => !docIds.includes(docId)))
    );
  }, []);

  const clearAllSelectedDocs = useCallback(() => {
    setSelectedDocsSet(new Set());
  }, []);

  const selectedDocIds = useMemo(
    () => Array.from(selectedDocsSet).filter((docId) => docMap.has(docId)),
    [selectedDocsSet, docMap]
  );

  const isDocSelected = useCallback(
    (docId: string) => selectedDocsSet.has(docId) && docMap.has(docId),
    [selectedDocsSet, docMap]
  );

  const usedSelectedDocsCount = selectedDocIds.length;

  const getCountOfSelectedDocs = useCallback(
    (docIds) => {
      if (!usedSelectedDocsCount) {
        return 0;
      }

      return docIds.filter(isDocSelected).length;
    },
    [usedSelectedDocsCount, isDocSelected]
  );

  return useMemo(
    () => ({
      isDocSelected,
      hasSelectedDocs: usedSelectedDocsCount > 0,
      getCountOfSelectedDocs,
      selectedDocIds,
      toggleDocSelection,
      selectAllDocs,
      selectMoreDocs,
      deselectSomeDocs,
      replaceSelectedDocs,
      clearAllSelectedDocs,
    }),
    [
      isDocSelected,
      getCountOfSelectedDocs,
      toggleDocSelection,
      selectAllDocs,
      selectMoreDocs,
      deselectSomeDocs,
      replaceSelectedDocs,
      clearAllSelectedDocs,
      usedSelectedDocsCount,
      selectedDocIds,
    ]
  );
};
