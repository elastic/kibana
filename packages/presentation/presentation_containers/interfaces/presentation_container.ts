/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiHasParentApi, PublishesViewMode } from '@kbn/presentation-publishing';
import { PublishesLastSavedState } from './last_saved_state';

export interface PanelPackage {
  panelType: string;
  initialState?: object;
}

export type PresentationContainer = Partial<PublishesViewMode> &
  PublishesLastSavedState & {
    addNewPanel: <ApiType extends unknown = unknown>(
      panel: PanelPackage,
      displaySuccessMessage?: boolean
    ) => Promise<ApiType | undefined>;
    registerPanelApi: <ApiType extends unknown = unknown>(
      panelId: string,
      panelApi: ApiType
    ) => void;
    removePanel: (panelId: string) => void;
    canRemovePanels?: () => boolean;
    replacePanel: (idToRemove: string, newPanel: PanelPackage) => Promise<string>;
  };

export const apiIsPresentationContainer = (
  unknownApi: unknown | null
): unknownApi is PresentationContainer => {
  return Boolean(
    (unknownApi as PresentationContainer)?.removePanel !== undefined &&
      (unknownApi as PresentationContainer)?.registerPanelApi !== undefined &&
      (unknownApi as PresentationContainer)?.replacePanel !== undefined &&
      (unknownApi as PresentationContainer)?.addNewPanel !== undefined
  );
};

export const getContainerParentFromAPI = (
  api: null | unknown
): PresentationContainer | undefined => {
  const apiParent = apiHasParentApi(api) ? api.parentApi : null;
  if (!apiParent) return undefined;
  return apiIsPresentationContainer(apiParent) ? apiParent : undefined;
};
