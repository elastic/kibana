/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';

export interface UseSelectedDocsState {
  isDocSelected: (docId: string) => boolean;
  getCountOfFilteredSelectedDocs: (docIds: string[]) => number;
  hasSelectedDocs: boolean;
  selectedDocsCount: number;
  docIdsInSelectionOrder: string[];
  toggleDocSelection: (docId: string) => void;
  toggleMultipleDocsSelection: (toDocId: string) => void;
  selectAllDocs: () => void;
  selectMoreDocs: (docIds: string[]) => void;
  deselectSomeDocs: (docIds: string[]) => void;
  replaceSelectedDocs: (docIds: string[]) => void;
  clearAllSelectedDocs: () => void;
  getSelectedDocsOrderedByRows: (rows: DataTableRecord[]) => DataTableRecord[];
}

export const useSelectedDocs = (
  docMap: Map<string, { doc: DataTableRecord; docIndex: number }>
): UseSelectedDocsState => {
  const [selectedDocsSet, setSelectedDocsSet] = useState<Set<string>>(new Set());
  const lastCheckboxToggledDocId = useRef<string | undefined>();

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
    lastCheckboxToggledDocId.current = docId;
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

  const toggleMultipleDocsSelection = useCallback(
    (toDocId: string) => {
      const shouldSelect = !isDocSelected(toDocId);

      const lastToggledDocIdIndex = docMap.get(
        lastCheckboxToggledDocId.current ?? toDocId
      )?.docIndex;
      const currentToggledDocIdIndex = docMap.get(toDocId)?.docIndex;
      const docIds: string[] = [];

      if (
        typeof lastToggledDocIdIndex === 'number' &&
        typeof currentToggledDocIdIndex === 'number' &&
        lastToggledDocIdIndex !== currentToggledDocIdIndex
      ) {
        const startIndex = Math.min(lastToggledDocIdIndex, currentToggledDocIdIndex);
        const endIndex = Math.max(lastToggledDocIdIndex, currentToggledDocIdIndex);

        docMap.forEach(({ doc, docIndex }) => {
          if (docIndex >= startIndex && docIndex <= endIndex) {
            docIds.push(doc.id);
          }
        });
      }

      if (shouldSelect) {
        selectMoreDocs(docIds);
      } else {
        deselectSomeDocs(docIds);
      }

      lastCheckboxToggledDocId.current = toDocId;
    },
    [selectMoreDocs, deselectSomeDocs, docMap, isDocSelected]
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
      toggleMultipleDocsSelection,
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
      toggleMultipleDocsSelection,
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
