/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Container, EmbeddableFactoryDefinition } from '../..';
import {
  FilterableContainer,
  FilterableContainerInput,
  FILTERABLE_CONTAINER,
} from './filterable_container';
import { EmbeddableStart } from '../../../plugin';

export class FilterableContainerFactory
  implements EmbeddableFactoryDefinition<FilterableContainerInput> {
  public readonly type = FILTERABLE_CONTAINER;

  constructor(
    private readonly getFactory: () => Promise<EmbeddableStart['getEmbeddableFactory']>
  ) {}

  public getDisplayName() {
    return i18n.translate('embeddableApi.samples.filterableContainer.displayName', {
      defaultMessage: 'filterable dashboard',
    });
  }

  public async isEditable() {
    return true;
  }

  public create = async (initialInput: FilterableContainerInput, parent?: Container) => {
    const getEmbeddableFactory = await this.getFactory();
    return new FilterableContainer(initialInput, getEmbeddableFactory, parent);
  };
}
