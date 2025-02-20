/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { apiCanAccessViewMode, getInheritedViewMode, type EmbeddableApiContext, apiIsOfType, CanAccessViewMode, HasType } from '@kbn/presentation-publishing';
import { IncompatibleActionError, type Action } from '@kbn/ui-actions-plugin/public';

import type { DiscoverAppLocator } from '../../../common';
import { getDiscoverLocatorParams } from '../utils/get_discover_locator_params';
import { ACTION_VIEW_SAVED_SEARCH } from './constants';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { PublishesSavedSearch, apiPublishesSavedSearch } from '../types';
import { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';

type ViewSavedSearchActionApi = CanAccessViewMode & HasType & PublishesSavedSearch;

export const compatibilityCheck = (
  api: EmbeddableApiContext['embeddable']
): api is ViewSavedSearchActionApi => {
  return (
    apiCanAccessViewMode(api) &&
    getInheritedViewMode(api) === 'view' &&
    apiIsOfType(api, SEARCH_EMBEDDABLE_TYPE) &&
    apiPublishesSavedSearch(api)
  );
};

export function getViewDiscoverSessionAction(application: ApplicationStart, locator: DiscoverAppLocator) {
  return {
    id: ACTION_VIEW_SAVED_SEARCH,
    type: ACTION_VIEW_SAVED_SEARCH,
    order: 20, // Same order as ACTION_OPEN_IN_DISCOVER
    execute: async ({ embeddable }: EmbeddableApiContext) => {
      if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();

      const locatorParams = getDiscoverLocatorParams(embeddable);
      await locator.navigate(locatorParams);
    },
    getDisplayName: () => i18n.translate('discover.savedSearchEmbeddable.action.viewSavedSearch.displayName', {
      defaultMessage: 'Open in Discover',
    }),
    getIconType: () => 'discoverApp',
    isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
      const { capabilities } = application;
      const hasDiscoverPermissions =
        (capabilities.discover_v2.show as boolean) || (capabilities.discover_v2.save as boolean);
      return hasDiscoverPermissions && compatibilityCheck(embeddable);
    }
  } as ActionDefinition<EmbeddableApiContext>
}
