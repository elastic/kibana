/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject, Observable } from 'rxjs';
import { combineLatest, isObservable, map, of, switchMap } from 'rxjs';
import type { PublishingSubject } from '../../publishing_subject';
import { apiHasParentApi } from '../has_parent_api';
import { apiHasUniqueId } from '../has_uuid';
import type { CanAddNewPanel } from './can_add_new_panel';
import { apiCanAddNewPanel } from './can_add_new_panel';
import type { CanAddNewSection } from './can_add_new_section';

export interface PanelPackage<SerializedState extends object = object> {
  panelType: string;
  maybePanelId?: string;

  /**
   * The serialized state of this panel.
   */
  serializedState?: SerializedState;
}

export interface PresentationContainer<ApiType extends unknown = unknown> extends CanAddNewPanel {
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
   * Gets a child API for the given ID. This is asynchronous and should await for the
   * child API to be available. It is best practice to retrieve a child API using this method
   */
  getChildApi: (uuid: string) => Promise<ApiType | undefined>;

  /**
   * A publishing subject containing the child APIs of the container. Note that
   * children are created asynchronously. This means that the children$ observable might
   * contain fewer children than the actual number of panels in the container. Use getChildApi
   * to retrieve the child API for a specific panel.
   */
  children$: PublishingSubject<{ [key: string]: ApiType }>;
}

export const apiIsPresentationContainer = (api: unknown | null): api is PresentationContainer => {
  return Boolean(
    apiCanAddNewPanel(api) &&
      typeof (api as PresentationContainer)?.removePanel === 'function' &&
      typeof (api as PresentationContainer)?.replacePanel === 'function' &&
      apiPublishesChildren(api)
  );
};

export interface HasSections extends CanAddNewSection {
  getPanelSection: (uuid: string) => string | undefined;
  panelSection$: (uuid: string) => Observable<string | undefined>;
}

export const apiHasSections = (api: unknown): api is HasSections => {
  return (
    typeof (api as HasSections)?.getPanelSection === 'function' &&
    typeof (api as HasSections)?.panelSection$ === 'function'
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
          // @ts-expect-error upgrade typescript v5.9.3
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
