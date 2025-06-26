/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useRef } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useRestorableState, UnifiedDataTableRestorableState } from '../restorable_state';

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
  const [selectedDocsMap, setSelectedDocsMap] = useRestorableState('selectedDocsMap', {});
  const lastCheckboxToggledDocId = useRef<string | undefined>();

  const toggleDocSelection = useCallback(
    (docId: string) => {
      setSelectedDocsMap((prevSelectedRowsSet) => {
        const newSelectedRowsSet = { ...prevSelectedRowsSet };
        if (newSelectedRowsSet[docId]) {
          delete newSelectedRowsSet[docId];
        } else {
          newSelectedRowsSet[docId] = true;
        }
        return newSelectedRowsSet;
      });
      lastCheckboxToggledDocId.current = docId;
    },
    [setSelectedDocsMap]
  );

  const replaceSelectedDocs = useCallback(
    (docIds: string[]) => {
      setSelectedDocsMap(createSelectedDocsMapFromIds(docIds));
    },
    [setSelectedDocsMap]
  );

  const selectAllDocs = useCallback(() => {
    setSelectedDocsMap(createSelectedDocsMapFromIds([...docMap.keys()]));
  }, [docMap, setSelectedDocsMap]);

  const selectMoreDocs = useCallback(
    (docIds: string[]) => {
      setSelectedDocsMap((prevSelectedRowsSet) =>
        createSelectedDocsMapFromIds([...getIdsFromSelectedDocsMap(prevSelectedRowsSet), ...docIds])
      );
    },
    [setSelectedDocsMap]
  );

  const deselectSomeDocs = useCallback(
    (docIds: string[]) => {
      setSelectedDocsMap((prevSelectedRowsSet) =>
        createSelectedDocsMapFromIds(
          getIdsFromSelectedDocsMap(prevSelectedRowsSet).filter((docId) => !docIds.includes(docId))
        )
      );
    },
    [setSelectedDocsMap]
  );

  const clearAllSelectedDocs = useCallback(() => {
    setSelectedDocsMap({});
  }, [setSelectedDocsMap]);

  const selectedDocIds = useMemo(
    () => getIdsFromSelectedDocsMap(selectedDocsMap).filter((docId) => docMap.has(docId)),
    [selectedDocsMap, docMap]
  );

  const isDocSelected = useCallback(
    (docId: string) => Boolean(selectedDocsMap[docId]) && docMap.has(docId),
    [selectedDocsMap, docMap]
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

function createSelectedDocsMapFromIds(
  docIds: string[]
): UnifiedDataTableRestorableState['selectedDocsMap'] {
  return docIds.reduce((acc, docId) => {
    acc[docId] = true;
    return acc;
  }, {} as UnifiedDataTableRestorableState['selectedDocsMap']);
}

function getIdsFromSelectedDocsMap(
  selectedDocsMap: UnifiedDataTableRestorableState['selectedDocsMap']
): string[] {
  return Object.keys(selectedDocsMap);
}
