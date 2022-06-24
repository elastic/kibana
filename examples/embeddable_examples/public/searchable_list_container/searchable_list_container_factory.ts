/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  ContainerOutput,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  EmbeddableStart,
} from '@kbn/embeddable-plugin/public';
import {
  SEARCHABLE_LIST_CONTAINER,
  SearchableListContainer,
  SearchableContainerInput,
} from './searchable_list_container';

interface StartServices {
  embeddableServices: EmbeddableStart;
}

export type SearchableListContainerFactory = EmbeddableFactory<
  SearchableContainerInput,
  ContainerOutput
>;
export class SearchableListContainerFactoryDefinition
  implements EmbeddableFactoryDefinition<SearchableContainerInput, ContainerOutput>
{
  public readonly type = SEARCHABLE_LIST_CONTAINER;
  public readonly isContainerType = true;

  constructor(private getStartServices: () => Promise<StartServices>) {}

  public async isEditable() {
    return true;
  }

  public create = async (initialInput: SearchableContainerInput) => {
    const { embeddableServices } = await this.getStartServices();
    return new SearchableListContainer(initialInput, embeddableServices);
  };

  public getDisplayName() {
    return i18n.translate('embeddableExamples.searchableListContainer.displayName', {
      defaultMessage: 'Searchable list container',
    });
  }
}
