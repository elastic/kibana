/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlGroupContainer, ControlGroupInput } from '@kbn/controls-plugin/public';
import { createContext } from 'react';
import type { FilterControlConfig } from './types';

export interface FilterGroupContextType {
  initialControls: FilterControlConfig[];
  dataViewId: string;
  controlGroup: ControlGroupContainer | undefined;
  controlGroupInputUpdates: ControlGroupInput | undefined;
  isViewMode: boolean;
  hasPendingChanges: boolean;
  pendingChangesPopoverOpen: boolean;
  closePendingChangesPopover: () => void;
  openPendingChangesPopover: () => void;
  switchToViewMode: () => void;
  switchToEditMode: () => void;
  setHasPendingChanges: (value: boolean) => void;
  setShowFiltersChangedBanner: (value: boolean) => void;
  saveChangesHandler: () => void;
  discardChangesHandler: () => void;
}

export const FilterGroupContext = createContext<FilterGroupContextType | undefined>(undefined);
