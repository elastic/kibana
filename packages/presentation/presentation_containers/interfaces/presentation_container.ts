/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiHasParentApi, apiHasUniqueId, PublishingSubject } from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatest, isObservable, map, Observable, of, switchMap } from 'rxjs';
import { apiCanAddNewPanel, CanAddNewPanel } from './can_add_new_panel';

export interface PanelPackage<SerializedState extends object = object> {
  panelType: string;
  initialState?: SerializedState;
}

export interface PresentationContainer extends CanAddNewPanel {
  /**
   * Removes a panel from the container.
   */
  removePanel: (panelId: string) => void;

  /**
   * Determines whether or not a container is capable of removing panels.
   */
  canRemovePanels?: () => boolean;

  /**
   * Replaces a panel in the container with a new panel.
   */
  replacePanel: <SerializedState extends object = object>(
    idToRemove: string,
    newPanel: PanelPackage<SerializedState>
  ) => Promise<string>;

  /**
   * Returns the number of panels in the container.
   */
  getPanelCount: () => number;

  /**
   * A publishing subject containing the child APIs of the container. Note that
   * children are created asynchronously. This means that the children$ observable might
   * contain fewer children than the actual number of panels in the container.
   */
  children$: PublishingSubject<{ [key: string]: unknown }>;
}

export const apiIsPresentationContainer = (api: unknown | null): api is PresentationContainer => {
  return Boolean(
    apiCanAddNewPanel(api) &&
      typeof (api as PresentationContainer)?.removePanel === 'function' &&
      typeof (api as PresentationContainer)?.replacePanel === 'function' &&
      typeof (api as PresentationContainer)?.addNewPanel === 'function' &&
      apiPublishesChildren(api)
  );
};

export const apiPublishesChildren = (
  api: unknown | null
): api is Pick<PresentationContainer, 'children$'> => {
  return Boolean((api as PresentationContainer)?.children$);
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
    lastCompatibleUuid = nextId;
    lastCleanupFunction = apiFound(compatibleApi) ?? undefined;
  });
  return () => {
    subscription.unsubscribe();
    lastCleanupFunction?.();
  };
};

export const combineCompatibleChildrenApis = <ApiType extends unknown, PublishingSubjectType>(
  api: unknown,
  observableKey: keyof ApiType,
  isCompatible: (api: unknown) => api is ApiType,
  emptyState: PublishingSubjectType,
  flattenMethod?: (array: PublishingSubjectType[]) => PublishingSubjectType
): Observable<PublishingSubjectType> => {
  if (!api || !apiPublishesChildren(api)) return of();

  return api.children$.pipe(
    switchMap((children) => {
      const compatibleChildren: Array<Observable<PublishingSubjectType>> = [];
      for (const child of Object.values(children)) {
        if (isCompatible(child) && isObservable(child[observableKey]))
          compatibleChildren.push(child[observableKey] as BehaviorSubject<PublishingSubjectType>);
      }

      if (compatibleChildren.length === 0) return of(emptyState);

      return combineLatest(compatibleChildren).pipe(
        map(
          flattenMethod
            ? flattenMethod
            : (nextCompatible) =>
                nextCompatible.flat().filter((value) => Boolean(value)) as PublishingSubjectType
        )
      );
    })
  );
};
