/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  EmbeddableFactoryDefinition,
  Container,
  ErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import type { SearchInput, SearchOutput } from './types';
import { SEARCH_EMBEDDABLE_TYPE } from './constants';
import { SavedSearchEmbeddable } from './saved_search_embeddable';
import { DiscoverServices } from '../build_services';
import type { SearchByReferenceInput } from '@kbn/saved-search-plugin/public';

export interface StartServices {
  executeTriggerActions: UiActionsStart['executeTriggerActions'];
  isEditable: () => boolean;
}

export class SearchEmbeddableFactory
  implements EmbeddableFactoryDefinition<SearchInput, SearchOutput, SavedSearchEmbeddable>
{
  public readonly type = SEARCH_EMBEDDABLE_TYPE;
  public readonly savedObjectMetaData = {
    name: i18n.translate('discover.savedSearch.savedObjectName', {
      defaultMessage: 'Saved search',
    }),
    type: 'search',
    getIconForSavedObject: () => 'discoverApp',
  };

  constructor(
    private getStartServices: () => Promise<StartServices>,
    private getDiscoverServices: () => Promise<DiscoverServices>
  ) {}

  public canCreateNew() {
    return false;
  }

  public isEditable = async () => {
    return (await this.getStartServices()).isEditable();
  };

  public getDisplayName() {
    return i18n.translate('discover.embeddable.search.displayName', {
      defaultMessage: 'search',
    });
  }

  public createFromSavedObject = async (
    savedObjectId: string,
    input: SearchInput,
    parent?: Container
  ): Promise<SavedSearchEmbeddable | ErrorEmbeddable> => {
    if (!(input as SearchByReferenceInput).savedObjectId) {
      (input as SearchByReferenceInput).savedObjectId = savedObjectId;
    }
    return this.create(input, parent);
  };

  public async create(input: SearchInput, parent?: Container) {
    const services = await this.getDiscoverServices();
    const filterManager = services.filterManager;

    try {
      const { executeTriggerActions } = await this.getStartServices();
      const { SavedSearchEmbeddable: SavedSearchEmbeddableClass } = await import(
        './saved_search_embeddable'
      );
      return new SavedSearchEmbeddableClass(
        {
          filterManager,
          editable: services.capabilities.discover.save as boolean,
          services,
        },
        input,
        executeTriggerActions,
        parent
      );
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
      return new ErrorEmbeddable(e, input, parent);
    }
  }
}
