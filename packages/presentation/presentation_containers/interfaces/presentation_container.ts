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
  HasParentApi,
  PublishesViewMode,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { debounceTime, switchMap } from 'rxjs/operators';
import { useEffect, useRef, useState } from 'react';
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
    getChild: (childId: string) => unknown;
    untilAllChildApisAvailable: () => Promise<void>;

    // todo consolidate these
    childIds: PublishingSubject<string[]>;
    getChildIds: () => string[];
  };

export const apiIsPresentationContainer = (api: unknown | null): api is PresentationContainer => {
  return Boolean(
    typeof (api as PresentationContainer)?.removePanel === 'function' &&
      typeof (api as PresentationContainer)?.registerPanelApi === 'function' &&
      typeof (api as PresentationContainer)?.replacePanel === 'function' &&
      typeof (api as PresentationContainer)?.addNewPanel === 'function' &&
      typeof (api as PresentationContainer)?.getChildIds === 'function' &&
      typeof (api as PresentationContainer)?.getChild === 'function'
  );
};

export const getContainerParentFromAPI = (
  api: null | unknown
): PresentationContainer | undefined => {
  const apiParent = apiHasParentApi(api) ? api.parentApi : null;
  if (!apiParent) return undefined;
  return apiIsPresentationContainer(apiParent) ? apiParent : undefined;
};

export const useClosestCompatibleApi = <ApiType extends unknown>(
  api: Partial<HasParentApi<PresentationContainer>>,
  isCompatible: (api: unknown) => api is ApiType
): ApiType | undefined => {
  const lastId = useRef<string | undefined>();
  const [compatibleApi, setCompatibleApi] = useState<ApiType | undefined>();

  useEffect(() => {
    const updateCompatibleApi = (nextApi: ApiType | undefined) => {
      const nextId = apiHasUniqueId(nextApi) ? nextApi.uuid : undefined;
      if (nextId !== lastId.current) {
        setCompatibleApi(nextApi);
        lastId.current = nextId;
      }
    };

    let canceled = false;
    const subscription = api.parentApi?.childIds
      .pipe(
        debounceTime(0),
        switchMap((childIds) => {
          return new Promise<string[]>((resolve) => {
            api.parentApi?.untilAllChildApisAvailable().then(() => resolve(childIds));
          });
        })
      )
      .subscribe((childIds) => {
        // first we check siblings to see if they are compatible
        const siblingId = childIds.find((id) => {
          const sibling = api.parentApi?.getChild(id);
          return isCompatible(sibling);
        });
        if (siblingId) {
          updateCompatibleApi(
            siblingId ? (api.parentApi?.getChild(siblingId) as ApiType) : undefined
          );
          return;
        }

        // if the parentApi is compatible, use it.
        if (isCompatible(api.parentApi)) {
          updateCompatibleApi(api.parentApi);
          return;
        }
        if (canceled) return;
      });
    return () => {
      subscription?.unsubscribe();
      canceled = true;
    };
  }, [api, isCompatible]);

  return compatibleApi;
};
