/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  EmbeddableFactoryDefinition,
  Container,
  ErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import type { SearchByReferenceInput } from '@kbn/saved-search-plugin/public';
import type { SearchInput, SearchOutput } from './types';
import { SEARCH_EMBEDDABLE_TYPE } from './constants';
import type { SavedSearchEmbeddable } from './saved_search_embeddable';
import type { DiscoverServices } from '../build_services';
import { inject, extract } from '../../common/embeddable';

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
  public readonly inject = inject;
  public readonly extract = extract;

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
    input: SearchByReferenceInput,
    parent?: Container
  ): Promise<SavedSearchEmbeddable | ErrorEmbeddable> => {
    if (!input.savedObjectId) {
      input.savedObjectId = savedObjectId;
    }

    return this.create(input, parent);
  };

  public async create(input: SearchInput, parent?: Container) {
    try {
      const services = await this.getDiscoverServices();
      const { executeTriggerActions } = await this.getStartServices();
      const { SavedSearchEmbeddable: SavedSearchEmbeddableClass } = await import(
        './saved_search_embeddable'
      );

      return new SavedSearchEmbeddableClass(
        {
          editable: Boolean(services.capabilities.discover.save),
          services,
          executeTriggerActions,
        },
        input,
        parent
      );
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
      return new ErrorEmbeddable(e, input, parent);
    }
  }
}
