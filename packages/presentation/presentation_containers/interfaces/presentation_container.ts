/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  apiCanAddNewPanel,
  apiHasParentApi,
  CanAddNewPanel,
  PanelPackage,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { PublishesLastSavedState } from './last_saved_state';
import { PublishesSettings } from './publishes_settings';

export type PresentationContainer = Partial<PublishesViewMode & PublishesSettings> &
  PublishesLastSavedState &
  CanAddNewPanel & {
    registerPanelApi: <ApiType extends unknown = unknown>(
      panelId: string,
      panelApi: ApiType
    ) => void;
    removePanel: (panelId: string) => void;
    canRemovePanels?: () => boolean;
    replacePanel: (idToRemove: string, newPanel: PanelPackage) => Promise<string>;
    getChildIds: () => string[];
    getChild: (childId: string) => unknown;
  };

export const apiIsPresentationContainer = (api: unknown | null): api is PresentationContainer => {
  return (
    apiCanAddNewPanel(api) &&
    Boolean(
      typeof (api as PresentationContainer)?.removePanel === 'function' &&
        typeof (api as PresentationContainer)?.registerPanelApi === 'function' &&
        typeof (api as PresentationContainer)?.replacePanel === 'function' &&
        typeof (api as PresentationContainer)?.getChildIds === 'function' &&
        typeof (api as PresentationContainer)?.getChild === 'function'
    )
  );
};

export const getContainerParentFromAPI = (
  api: null | unknown
): PresentationContainer | undefined => {
  const apiParent = apiHasParentApi(api) ? api.parentApi : null;
  if (!apiParent) return undefined;
  return apiIsPresentationContainer(apiParent) ? apiParent : undefined;
};
