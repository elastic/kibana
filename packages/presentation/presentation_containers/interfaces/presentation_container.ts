/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  apiHasParentApi,
  apiHasUniqueId,
  PublishesViewMode,
  PublishingSubject,
} from '@kbn/presentation-publishing';

export interface PanelPackage {
  panelType: string;
  initialState?: object;
}

export interface PresentationContainer extends Partial<PublishesViewMode> {
  addNewPanel: <ApiType extends unknown = unknown>(
    panel: PanelPackage,
    displaySuccessMessage?: boolean
  ) => Promise<ApiType | undefined>;
  removePanel: (panelId: string) => void;
  canRemovePanels?: () => boolean;
  replacePanel: (idToRemove: string, newPanel: PanelPackage) => Promise<string>;

  children$: PublishingSubject<{ [key: string]: unknown }>;
}

export const apiIsPresentationContainer = (api: unknown | null): api is PresentationContainer => {
  return Boolean(
    typeof (api as PresentationContainer)?.removePanel === 'function' &&
      typeof (api as PresentationContainer)?.replacePanel === 'function' &&
      typeof (api as PresentationContainer)?.addNewPanel === 'function' &&
      (api as PresentationContainer)?.children$
  );
};

export const getContainerParentFromAPI = (
  api: null | unknown
): PresentationContainer | undefined => {
  const apiParent = apiHasParentApi(api) ? api.parentApi : null;
  if (!apiParent) return undefined;
  return apiIsPresentationContainer(apiParent) ? apiParent : undefined;
};

export const listenForCompatibleApi = <ApiType extends unknown>(
  parent: unknown,
  isCompatible: (api: unknown) => api is ApiType,
  apiFound: (api: ApiType | undefined) => (() => void) | void
) => {
  if (!parent || !apiIsPresentationContainer(parent)) return () => {};

  let lastCleanupFunction: (() => void) | undefined;
  let lastCompatibleUuid: string | null;
  const subscription = parent.children$.subscribe((children) => {
    lastCleanupFunction?.();
    const compatibleApi = (() => {
      for (const childId of Object.keys(children)) {
        const child = children[childId];
        if (isCompatible(child)) return child;
      }
      if (isCompatible(parent)) return parent;
      return undefined;
    })();
    const nextId = apiHasUniqueId(compatibleApi) ? compatibleApi.uuid : null;
    if (nextId === lastCompatibleUuid) return;
    lastCleanupFunction = apiFound(compatibleApi) ?? undefined;
  });
  return () => {
    subscription.unsubscribe();
    lastCleanupFunction?.();
  };
};
