/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { apiHasParentApi, apiPublishesSearchSession } from '@kbn/presentation-publishing';
import { firstValueFrom } from 'rxjs';
import { EmbeddableStart } from '../..';
import { apiHasAppContext, NavigateToEditorApi } from './types';

/**
 * Call this function to navigate to a given editor application
 * @param services The services needed to perform the navigation
 * @param api The embeddable API, which should, at minimum, provide a callback for fetching
 *            the editor app target (app ID, path to navigate to, and generic editor URL)
 */
export const navigateToEditor = async (
  services: { core: CoreStart; embeddable: EmbeddableStart },
  api: NavigateToEditorApi
) => {
  const appTarget = await api.getEditorAppTarget();
  if (appTarget.editApp && appTarget.editPath) {
    /** The editor has a dedicated app */
    const apiContext = apiHasAppContext(api) ? api.getAppContext() : undefined;
    const parentApiContext =
      apiHasParentApi(api) && apiHasAppContext(api.parentApi)
        ? api.parentApi.getAppContext()
        : undefined;
    let currentAppId = parentApiContext?.currentAppId ?? apiContext?.currentAppId;
    if (!currentAppId) {
      /** If the API is not providing a current app ID, then get it from Core */
      currentAppId = await firstValueFrom(services.core.application.currentAppId$);
    }
    const serializedState = api.serializeState?.().rawState;

    if (currentAppId && serializedState) {
      /**
       * The state transfer service should only be used when both (1) the current app ID is defined so
       * that we know where to return to and (2) there is actually state to transfer
       */
      const stateTransfer = services.embeddable.getStateTransfer();
      await stateTransfer.navigateToEditor(appTarget.editApp, {
        path: appTarget.editPath,
        state: {
          embeddableId: api.uuid,
          originatingApp: currentAppId,
          originatingPath: parentApiContext?.getCurrentPath?.() ?? apiContext?.getCurrentPath?.(),
          searchSessionId: apiPublishesSearchSession(api.parentApi)
            ? api.parentApi.searchSessionId$.getValue()
            : undefined,
          valueInput: serializedState ? { id: api.uuid, ...serializedState } : undefined,
        },
      });
    } else {
      /** Otherwise, navigate directly to the editor app without using the state transfer service */
      await services.core.application.navigateToApp(appTarget.editApp, {
        path: appTarget.editPath,
      });
    }
    return;
  }

  if (appTarget.editUrl) {
    /** The editor does not have a dedicated app - added for legacy support */
    window.location.href = appTarget.editUrl;
  }
};
