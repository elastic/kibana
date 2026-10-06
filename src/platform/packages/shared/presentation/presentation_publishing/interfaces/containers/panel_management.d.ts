/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '../../publishing_subject';
import type { PanelPackage } from './presentation_container';
export interface CanDuplicatePanels {
  duplicatePanel: (panelId: string) => void;
}
export declare const apiCanDuplicatePanels: (
  unknownApi: unknown | null
) => unknownApi is CanDuplicatePanels;
export interface CanExpandPanels {
  expandPanel: (panelId: string) => void;
  expandedPanelId$: PublishingSubject<string | undefined>;
}
export declare const apiCanExpandPanels: (
  unknownApi: unknown | null
) => unknownApi is CanExpandPanels;
export interface HasPinnedPanels {
  panelIsPinned: (panelId: string) => boolean;
}
export interface CanPinPanels extends HasPinnedPanels {
  pinPanel: (panelId: string) => void;
  unpinPanel: (panelId: string) => void;
  addPinnedPanel: <StateType extends object, ApiType extends unknown = unknown>(
    panel: PanelPackage<StateType>
  ) => Promise<ApiType | undefined>;
}
export declare const apiHasPinnedPanels: (api: unknown) => api is HasPinnedPanels;
export declare const apiCanPinPanels: (api: unknown) => api is CanPinPanels;
