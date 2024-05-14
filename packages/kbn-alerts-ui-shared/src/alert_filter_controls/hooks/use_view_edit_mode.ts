/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ControlGroupContainer } from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/common';
import { useCallback, useEffect, useState } from 'react';

interface UseViewEditModeArgs {
  controlGroup: ControlGroupContainer | undefined;
  initialMode?: ViewMode;
}

export const useViewEditMode = ({
  controlGroup,
  initialMode = ViewMode.VIEW,
}: UseViewEditModeArgs) => {
  const [filterGroupMode, setFilterGroupMode] = useState(initialMode);

  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [pendingChangesPopoverOpen, setPendingChangesPopoverOpen] = useState(false);

  useEffect(() => {
    if (controlGroup && controlGroup.getInput().viewMode !== filterGroupMode) {
      controlGroup.updateInput({ viewMode: filterGroupMode });
    }
  }, [controlGroup, filterGroupMode]);

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
    controlGroup?.updateInput({ viewMode: ViewMode.EDIT });
    setFilterGroupMode(ViewMode.EDIT);
  }, [controlGroup]);

  const switchToViewMode = useCallback(() => {
    controlGroup?.updateInput({ viewMode: ViewMode.VIEW });
    setHasPendingChanges(false);
    setFilterGroupMode(ViewMode.VIEW);
  }, [controlGroup]);

  const isViewMode = filterGroupMode === ViewMode.VIEW;

  return {
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
