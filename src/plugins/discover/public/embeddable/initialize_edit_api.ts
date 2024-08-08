/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  apiHasAppContext,
  FetchContext,
  HasAppContext,
  HasEditCapabilities,
  PublishesDataViews,
  PublishesSavedObjectId,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { DiscoverServices } from '../build_services';
import { PublishesSavedSearch } from './types';
import { getDiscoverLocatorParams } from './utils/get_discover_locator_params';

type SavedSearchPartialApi = PublishesSavedSearch &
  PublishesSavedObjectId &
  PublishesDataViews & { fetchContext$: PublishingSubject<FetchContext | undefined> };

export async function getAppTarget(
  partialApi: SavedSearchPartialApi,
  discoverServices: DiscoverServices
) {
  const savedObjectId = partialApi.savedObjectId.getValue();
  const dataViews = partialApi.dataViews.getValue();
  const locatorParams = getDiscoverLocatorParams(partialApi);

  // We need to use a redirect URL if this is a by value saved search using
  // an ad hoc data view to ensure the data view spec gets encoded in the URL
  const useRedirect = !savedObjectId && !dataViews?.[0]?.isPersisted();
  const editUrl = useRedirect
    ? discoverServices.locator.getRedirectUrl(locatorParams)
    : await discoverServices.locator.getUrl(locatorParams);
  const editPath = discoverServices.core.http.basePath.remove(editUrl);
  const editApp = useRedirect ? 'r' : 'discover';

  return { path: editPath, app: editApp, editUrl };
}

export function initializeEditApi<
  ParentApiType = unknown,
  ReturnType = ParentApiType extends HasAppContext ? HasEditCapabilities : {}
>({
  uuid,
  parentApi,
  partialApi,
  isEditable,
  discoverServices,
}: {
  uuid: string;
  parentApi?: ParentApiType;
  partialApi: PublishesSavedSearch &
    PublishesSavedObjectId &
    PublishesDataViews & { fetchContext$: PublishingSubject<FetchContext | undefined> };
  isEditable: () => boolean;
  discoverServices: DiscoverServices;
}): ReturnType {
  /**
   * If the parent is providing context, then the embeddable state transfer service can be used
   * and editing should be allowed; otherwise, do not provide editing capabilities
   */
  if (!parentApi || !apiHasAppContext(parentApi)) {
    return {} as ReturnType;
  }
  const parentApiContext = parentApi.getAppContext();

  return {
    getTypeDisplayName: () =>
      i18n.translate('discover.embeddable.search.displayName', {
        defaultMessage: 'search',
      }),
    onEdit: async () => {
      const appTarget = await getAppTarget(partialApi, discoverServices);
      const stateTransfer = discoverServices.embeddable.getStateTransfer();

      await stateTransfer.navigateToEditor(appTarget.app, {
        path: appTarget.path,
        state: {
          embeddableId: uuid,
          valueInput: partialApi.savedSearch$.getValue(),
          originatingApp: parentApiContext.currentAppId,
          searchSessionId: partialApi.fetchContext$.getValue()?.searchSessionId,
          originatingPath: parentApiContext.getCurrentPath?.(),
        },
      });
    },
    isEditingEnabled: isEditable,
    getEditHref: async () => {
      return (await getAppTarget(partialApi, discoverServices))?.path;
    },
  } as ReturnType;
}
