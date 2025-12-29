/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '@kbn/presentation-publishing/publishing_subject';
import type { PanelPackage } from './presentation_container';

export interface CanDuplicatePanels {
  duplicatePanel: (panelId: string) => void;
}

export const apiCanDuplicatePanels = (
  unknownApi: unknown | null
): unknownApi is CanDuplicatePanels => {
  return Boolean((unknownApi as CanDuplicatePanels)?.duplicatePanel !== undefined);
};

export interface CanExpandPanels {
  expandPanel: (panelId: string) => void;
  expandedPanelId$: PublishingSubject<string | undefined>;
}

export const apiCanExpandPanels = (unknownApi: unknown | null): unknownApi is CanExpandPanels => {
  return Boolean((unknownApi as CanExpandPanels)?.expandPanel !== undefined);
};

export interface CanPinPanel {
  pinPanel: (panelId: string) => void;
  unpinPanel: (panelId: string) => void;
  panelIsPinned: (panelId: string) => boolean;
  addPinnedPanel: <StateType extends object, ApiType extends unknown = unknown>(
    panel: PanelPackage<StateType>
  ) => Promise<ApiType | undefined>;
}

export const apiCanPinPanels = (api: unknown): api is CanPinPanel => {
  return (
    typeof (api as CanPinPanel)?.pinPanel === 'function' &&
    typeof (api as CanPinPanel)?.unpinPanel === 'function' &&
    typeof (api as CanPinPanel)?.panelIsPinned === 'function' &&
    typeof (api as CanPinPanel)?.addPinnedPanel === 'function'
  );
};
