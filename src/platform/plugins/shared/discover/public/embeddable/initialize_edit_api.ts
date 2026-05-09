/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type {
  FetchContext,
  HasEditCapabilities,
  PublishesDataViews,
  PublishesSavedObjectId,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { apiHasAppContext, apiIsPresentationContainer } from '@kbn/presentation-publishing';
import { getAllEsqlControls } from '@kbn/esql-utils';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { DiscoverServices } from '../build_services';
import type { PublishesSavedSearch, PublishesSelectedTabId } from './types';
import { getDiscoverLocatorParams } from './utils/get_discover_locator_params';
import { fromSavedSearchToSavedObjectTab } from '../application/main/state_management/redux';
import type { DiscoverSessionByValueInput } from '../plugin_imports/embeddable_editor_service';

type SavedSearchPartialApi = PublishesSavedSearch &
  PublishesSavedObjectId &
  PublishesDataViews & { fetchContext$: PublishingSubject<FetchContext | undefined> };

export async function getAppTarget(
  partialApi: SavedSearchPartialApi,
  discoverServices: DiscoverServices
) {
  const savedObjectId = partialApi.savedObjectId$.getValue();
  const dataViews = partialApi.dataViews$.getValue();
  const locatorParams = getDiscoverLocatorParams(partialApi);

  // We need to use a redirect URL if this is a by value saved search using
  // an ad hoc data view to ensure the data view spec gets encoded in the URL
  const useRedirect = !savedObjectId && !dataViews?.[0]?.isPersisted();

  const urlWithoutLocationState = await discoverServices.locator.getUrl({});

  const editUrl = useRedirect
    ? discoverServices.locator.getRedirectUrl(locatorParams)
    : await discoverServices.locator.getUrl(locatorParams);

  const editPath = discoverServices.core.http.basePath.remove(editUrl);

  return {
    editPath,
    editUrl,
    urlWithoutLocationState,
  };
}

export function initializeEditApi({
  uuid,
  parentApi,
  partialApi,
  isEditable,
  discoverServices,
  getTitle,
}: {
  uuid: string;
  parentApi?: unknown;
  partialApi: PublishesSavedSearch &
    PublishesSavedObjectId &
    PublishesSelectedTabId &
    PublishesDataViews & { fetchContext$: PublishingSubject<FetchContext | undefined> };
  isEditable: () => boolean;
  getTitle: () => string | undefined;
  discoverServices: DiscoverServices;
}): HasEditCapabilities | undefined {
  /**
   * If the parent is providing context, then the embeddable state transfer service can be used
   * and editing should be allowed; otherwise, do not provide editing capabilities
   */
  if (!parentApi || !apiHasAppContext(parentApi)) {
    return;
  }

  const parentApiContext = parentApi.getAppContext();

  return {
    getTypeDisplayName: () =>
      i18n.translate('discover.embeddable.search.displayName', {
        defaultMessage: 'Discover session',
      }),
    onEdit: async () => {
      const stateTransfer = discoverServices.embeddable.getStateTransfer();
      const isByReference = Boolean(partialApi.savedObjectId$.getValue());
      const locatorParams = getDiscoverLocatorParams({ ...partialApi, parentApi });
      const valueInput: DiscoverSessionByValueInput | undefined = isByReference
        ? undefined
        : {
            discoverSessionTab: fromSavedSearchToSavedObjectTab({
              tab: {
                id: uuid,
                label:
                  getTitle() ||
                  i18n.translate('discover.embeddable.byValueTabName', {
                    defaultMessage: 'By-value Discover session',
                  }),
              },
              savedSearch: {
                ...partialApi.savedSearch$.getValue(),
                controlGroupJson: locatorParams.esqlControls
                  ? JSON.stringify(locatorParams.esqlControls)
                  : undefined,
              },
              services: discoverServices,
            }),
            dashboardControlGroupState: apiIsPresentationContainer(parentApi)
              ? (getAllEsqlControls(parentApi) as ControlPanelsState<OptionsListESQLControlState>)
              : undefined,
          };

      let app: string;
      let path: string | undefined;

      if (isByReference) {
        ({ app, path } = await discoverServices.locator.getLocation(locatorParams));
      } else {
        ({ app, path } = await discoverServices.locator.getLocation({}));
      }

      await stateTransfer.navigateToEditor(app, {
        path,
        state: {
          embeddableId: uuid,
          valueInput,
          searchSessionId: partialApi.fetchContext$.getValue()?.searchSessionId,
          originatingApp: parentApiContext.currentAppId,
          originatingPath: parentApiContext.getCurrentPath?.(),
        },
      });
    },
    isEditingEnabled: isEditable,
    getEditHref: async () => {
      return (await getAppTarget(partialApi, discoverServices))?.editPath;
    },
  };
}
