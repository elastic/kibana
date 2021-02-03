/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  FilterableEmbeddable,
  FilterableEmbeddableInput,
  FILTERABLE_EMBEDDABLE,
} from './filterable_embeddable';
import { EmbeddableFactoryDefinition } from '../../embeddables';
import { IContainer } from '../../containers';

export class FilterableEmbeddableFactory
  implements EmbeddableFactoryDefinition<FilterableEmbeddableInput> {
  public readonly type = FILTERABLE_EMBEDDABLE;

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.samples.filterableEmbeddable.displayName', {
      defaultMessage: 'filterable',
    });
  }

  public async create(initialInput: FilterableEmbeddableInput, parent?: IContainer) {
    return new FilterableEmbeddable(initialInput, parent);
  }
}
