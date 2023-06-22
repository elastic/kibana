/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import type { EmbeddableInput, IContainer } from '@kbn/embeddable-plugin/public';
import { EmbeddableFactory, EmbeddableFactoryDefinition } from '@kbn/embeddable-plugin/public';

import { NAVIGATION_EMBEDDABLE_TYPE } from './navigation_embeddable';

export type NavigationEmbeddableFactory = EmbeddableFactory;

export class NavigationEmbeddableFactoryDefinition implements EmbeddableFactoryDefinition {
  public readonly type = NAVIGATION_EMBEDDABLE_TYPE;

  public async isEditable() {
    return true;
  }

  public canCreateNew() {
    return true;
  }

  public async create(initialInput: EmbeddableInput, parent?: IContainer) {
    const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();
    const { NavigationEmbeddable } = await import('./navigation_embeddable');

    return new NavigationEmbeddable(reduxEmbeddablePackage, initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('navigationEmbeddable.navigationEmbeddableFactory.displayName', {
      defaultMessage: 'Navigation',
    });
  }

  public getIconType() {
    return 'link';
  }
}
