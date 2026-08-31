/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useRef, useState } from 'react';

export interface UseWorkflowExecutionsGridSelectionResult {
  selectedExecutionIds: string[];
  selectedExecutionsCount: number;
  isExecutionSelected: (executionId: string) => boolean;
  toggleExecutionSelection: (executionId: string, shiftKey?: boolean) => void;
  selectAllVisibleExecutions: () => void;
  deselectVisibleExecutions: () => void;
  clearAllSelectedExecutions: () => void;
  getVisibleSelectionState: () => {
    areAllVisibleSelected: boolean;
    isIndeterminate: boolean;
  };
}

export const useWorkflowExecutionsGridSelection = (
  visibleExecutionIds: string[]
): UseWorkflowExecutionsGridSelectionResult => {
  const [selectedExecutionIds, setSelectedExecutionIds] = useState<string[]>([]);
  const lastSelectedIdRef = useRef<string | null>(null);

  const selectedExecutionIdSet = useMemo(
    () => new Set(selectedExecutionIds),
    [selectedExecutionIds]
  );

  const isExecutionSelected = useCallback(
    (executionId: string) => selectedExecutionIdSet.has(executionId),
    [selectedExecutionIdSet]
  );

  const toggleExecutionSelection = useCallback(
    (executionId: string, shiftKey = false) => {
      setSelectedExecutionIds((currentSelectedIds) => {
        const currentSet = new Set(currentSelectedIds);

        if (shiftKey && lastSelectedIdRef.current != null) {
          const startIndex = visibleExecutionIds.indexOf(lastSelectedIdRef.current);
          const endIndex = visibleExecutionIds.indexOf(executionId);

          if (startIndex !== -1 && endIndex !== -1) {
            const [from, to] =
              startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
            const rangeIds = visibleExecutionIds.slice(from, to + 1);
            rangeIds.forEach((id) => currentSet.add(id));
            lastSelectedIdRef.current = executionId;
            return Array.from(currentSet);
          }
        }

        if (currentSet.has(executionId)) {
          currentSet.delete(executionId);
        } else {
          currentSet.add(executionId);
        }

        lastSelectedIdRef.current = executionId;
        return Array.from(currentSet);
      });
    },
    [visibleExecutionIds]
  );

  const selectAllVisibleExecutions = useCallback(() => {
    setSelectedExecutionIds((currentSelectedIds) => {
      const next = new Set(currentSelectedIds);
      visibleExecutionIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  }, [visibleExecutionIds]);

  const deselectVisibleExecutions = useCallback(() => {
    setSelectedExecutionIds((currentSelectedIds) => {
      const visibleIdSet = new Set(visibleExecutionIds);
      return currentSelectedIds.filter((id) => !visibleIdSet.has(id));
    });
  }, [visibleExecutionIds]);

  const clearAllSelectedExecutions = useCallback(() => {
    setSelectedExecutionIds([]);
    lastSelectedIdRef.current = null;
  }, []);

  const getVisibleSelectionState = useCallback(() => {
    if (visibleExecutionIds.length === 0) {
      return { areAllVisibleSelected: false, isIndeterminate: false };
    }

    const selectedVisibleCount = visibleExecutionIds.filter((id) =>
      selectedExecutionIdSet.has(id)
    ).length;

    return {
      areAllVisibleSelected: selectedVisibleCount === visibleExecutionIds.length,
      isIndeterminate:
        selectedVisibleCount > 0 && selectedVisibleCount < visibleExecutionIds.length,
    };
  }, [selectedExecutionIdSet, visibleExecutionIds]);

  return {
    selectedExecutionIds,
    selectedExecutionsCount: selectedExecutionIds.length,
    isExecutionSelected,
    toggleExecutionSelection,
    selectAllVisibleExecutions,
    deselectVisibleExecutions,
    clearAllSelectedExecutions,
    getVisibleSelectionState,
  };
};
