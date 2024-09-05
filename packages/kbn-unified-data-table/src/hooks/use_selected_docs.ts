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
  getCountOfFilteredSelectedDocs: (docIds: string[]) => number;
  hasSelectedDocs: boolean;
  selectedDocsCount: number;
  docIdsInSelectionOrder: string[];
  toggleDocSelection: (docId: string) => void;
  selectAllDocs: () => void;
  selectMoreDocs: (docIds: string[]) => void;
  deselectSomeDocs: (docIds: string[]) => void;
  replaceSelectedDocs: (docIds: string[]) => void;
  clearAllSelectedDocs: () => void;
  getSelectedDocsOrderedByRows: (rows: DataTableRecord[]) => DataTableRecord[];
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

  const getSelectedDocsOrderedByRows = useCallback(
    (rows: DataTableRecord[]) => {
      return rows.filter((row) => isDocSelected(row.id));
    },
    [isDocSelected]
  );

  const selectedDocsCount = selectedDocIds.length;

  const getCountOfFilteredSelectedDocs = useCallback(
    (docIds: string[]) => {
      if (!selectedDocsCount) {
        return 0;
      }

      return docIds.filter(isDocSelected).length;
    },
    [selectedDocsCount, isDocSelected]
  );

  return useMemo(
    () => ({
      isDocSelected,
      hasSelectedDocs: selectedDocsCount > 0,
      selectedDocsCount,
      docIdsInSelectionOrder: selectedDocIds,
      getCountOfFilteredSelectedDocs,
      toggleDocSelection,
      selectAllDocs,
      selectMoreDocs,
      deselectSomeDocs,
      replaceSelectedDocs,
      clearAllSelectedDocs,
      getSelectedDocsOrderedByRows,
    }),
    [
      isDocSelected,
      getCountOfFilteredSelectedDocs,
      toggleDocSelection,
      selectAllDocs,
      selectMoreDocs,
      deselectSomeDocs,
      replaceSelectedDocs,
      clearAllSelectedDocs,
      selectedDocIds,
      selectedDocsCount,
      getSelectedDocsOrderedByRows,
    ]
  );
};
