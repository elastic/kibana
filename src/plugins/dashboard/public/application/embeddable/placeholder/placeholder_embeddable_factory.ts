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
  EmbeddableInput,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { PLACEHOLDER_EMBEDDABLE } from '.';

export class PlaceholderEmbeddableFactory implements EmbeddableFactoryDefinition {
  public readonly type = PLACEHOLDER_EMBEDDABLE;

  constructor() {}

  public async isEditable() {
    return false;
  }

  public canCreateNew() {
    return false;
  }

  public async create(initialInput: EmbeddableInput, parent?: IContainer) {
    const { PlaceholderEmbeddable } = await import('./placeholder_embeddable');
    return new PlaceholderEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('dashboard.placeholder.factory.displayName', {
      defaultMessage: 'placeholder',
    });
  }
}
