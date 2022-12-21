/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { ApplicationStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { IEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';
import { Action } from '@kbn/ui-actions-plugin/public';
import { getSavedSearchUrl } from '@kbn/saved-search-plugin/public';
import { SavedSearchEmbeddable } from './saved_search_embeddable';
import { SEARCH_EMBEDDABLE_TYPE } from '../../common';

export const ACTION_VIEW_SAVED_SEARCH = 'ACTION_VIEW_SAVED_SEARCH';

export interface ViewSearchContext {
  embeddable: IEmbeddable;
}

export class ViewSavedSearchAction implements Action<ViewSearchContext> {
  public id = ACTION_VIEW_SAVED_SEARCH;
  public readonly type = ACTION_VIEW_SAVED_SEARCH;

  constructor(private readonly application: ApplicationStart) {}

  async execute(context: ActionExecutionContext<ViewSearchContext>): Promise<void> {
    const { embeddable } = context;
    const savedSearchId = (embeddable as SavedSearchEmbeddable).getSavedSearch().id;
    const path = getSavedSearchUrl(savedSearchId);
    const app = embeddable ? embeddable.getOutput().editApp : undefined;
    await this.application.navigateToApp(app ? app : 'discover', { path });
  }

  getDisplayName(context: ActionExecutionContext<ViewSearchContext>): string {
    return i18n.translate('discover.savedSearchEmbeddable.action.viewSavedSearch.displayName', {
      defaultMessage: 'Open in Discover',
    });
  }

  getIconType(context: ActionExecutionContext<ViewSearchContext>): string | undefined {
    return 'inspect';
  }

  async isCompatible(context: ActionExecutionContext<ViewSearchContext>) {
    const { embeddable } = context;
    const { capabilities } = this.application;
    const hasDiscoverPermissions =
      (capabilities.discover.show as boolean) || (capabilities.discover.save as boolean);
    return Boolean(
      embeddable.type === SEARCH_EMBEDDABLE_TYPE &&
        embeddable.getInput().viewMode === ViewMode.VIEW &&
        hasDiscoverPermissions
    );
  }
}
