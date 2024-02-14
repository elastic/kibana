/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ApplicationStart } from '@kbn/core/public';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiCanAccessViewMode,
  apiHasType,
  apiIsOfType,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  HasType,
} from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';

import type { DiscoverAppLocator } from '../../common';
import { getDiscoverLocatorParams } from './get_discover_locator_params';
import type { SavedSearchEmbeddable } from './saved_search_embeddable';

export const ACTION_VIEW_SAVED_SEARCH = 'ACTION_VIEW_SAVED_SEARCH';

type ViewSavedSearchActionApi = CanAccessViewMode & HasType;

const isApiCompatible = (api: unknown | null): api is ViewSavedSearchActionApi =>
  Boolean(apiCanAccessViewMode(api)) && Boolean(apiHasType(api));

const isSavedSearchEmbeddable = (
  api: EmbeddableApiContext['embeddable']
): api is SavedSearchEmbeddable => {
  return (
    Boolean((api as SavedSearchEmbeddable).getInput) &&
    Boolean((api as SavedSearchEmbeddable).getSavedSearch)
  );
};

const compatibilityCheck = (api: EmbeddableApiContext['embeddable']) => {
  return (
    isApiCompatible(api) &&
    getInheritedViewMode(api) === ViewMode.VIEW &&
    apiIsOfType(api, SEARCH_EMBEDDABLE_TYPE)
  );
};

export class ViewSavedSearchAction implements Action<EmbeddableApiContext> {
  public id = ACTION_VIEW_SAVED_SEARCH;
  public readonly type = ACTION_VIEW_SAVED_SEARCH;

  constructor(
    private readonly application: ApplicationStart,
    private readonly locator: DiscoverAppLocator
  ) {}

  async execute(api: EmbeddableApiContext): Promise<void> {
    const { embeddable } = api;
    if (!compatibilityCheck(embeddable) || !isSavedSearchEmbeddable(embeddable)) return;

    const savedSearch = embeddable.getSavedSearch();
    if (!savedSearch) {
      return;
    }
    const locatorParams = getDiscoverLocatorParams({
      input: embeddable.getInput(),
      savedSearch,
    });
    await this.locator.navigate(locatorParams);
  }

  getDisplayName(): string {
    return i18n.translate('discover.savedSearchEmbeddable.action.viewSavedSearch.displayName', {
      defaultMessage: 'Open in Discover',
    });
  }

  getIconType(): string | undefined {
    return 'inspect';
  }

  async isCompatible({ embeddable }: EmbeddableApiContext) {
    const { capabilities } = this.application;
    const hasDiscoverPermissions =
      (capabilities.discover.show as boolean) || (capabilities.discover.save as boolean);
    return compatibilityCheck(embeddable) && hasDiscoverPermissions;
  }
}
