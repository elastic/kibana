/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  EmbeddableFactoryDefinition,
  ContainerInput,
  EmbeddableStart,
  EmbeddableFactory,
  ContainerOutput,
} from '@kbn/embeddable-plugin/public';
import { LIST_CONTAINER, ListContainer } from './list_container';

interface StartServices {
  embeddableServices: EmbeddableStart;
}

export type ListContainerFactory = EmbeddableFactory<ContainerInput, ContainerOutput>;
export class ListContainerFactoryDefinition
  implements EmbeddableFactoryDefinition<ContainerInput, ContainerOutput>
{
  public readonly type = LIST_CONTAINER;
  public readonly isContainerType = true;

  constructor(private getStartServices: () => Promise<StartServices>) {}

  public async isEditable() {
    return true;
  }

  public create = async (initialInput: ContainerInput) => {
    const { embeddableServices } = await this.getStartServices();
    return new ListContainer(initialInput, embeddableServices);
  };

  public getDisplayName() {
    return i18n.translate('embeddableExamples.searchableListContainer.displayName', {
      defaultMessage: 'List container',
    });
  }
}
