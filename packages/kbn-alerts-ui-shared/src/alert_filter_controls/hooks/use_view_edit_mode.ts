/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ViewMode } from '@kbn/embeddable-plugin/common';
import { useCallback, useEffect, useState } from 'react';

interface UseViewEditModeArgs {
  initialMode?: ViewMode;
}

export const useViewEditMode = ({ initialMode = ViewMode.VIEW }: UseViewEditModeArgs) => {
  const [filterGroupMode, setFilterGroupMode] = useState(initialMode);

  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [pendingChangesPopoverOpen, setPendingChangesPopoverOpen] = useState(false);

  useEffect(() => {
    setPendingChangesPopoverOpen(hasPendingChanges);
  }, [hasPendingChanges]);

  const closePendingChangesPopover = useCallback(() => {
    setPendingChangesPopoverOpen(false);
  }, []);

  const openPendingChangesPopover = useCallback(() => {
    if (hasPendingChanges) setPendingChangesPopoverOpen(true);
  }, [hasPendingChanges]);

  const switchToEditMode = useCallback(() => {
    setFilterGroupMode(ViewMode.EDIT);
  }, []);

  const switchToViewMode = useCallback(() => {
    setHasPendingChanges(false);
    setFilterGroupMode(ViewMode.VIEW);
  }, []);

  const isViewMode = filterGroupMode === ViewMode.VIEW;

  return {
    filterGroupMode,
    isViewMode,
    hasPendingChanges,
    pendingChangesPopoverOpen,
    closePendingChangesPopover,
    openPendingChangesPopover,
    switchToEditMode,
    switchToViewMode,
    setHasPendingChanges,
  };
};
