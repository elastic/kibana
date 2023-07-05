/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EmbeddableFactoryDefinition } from '@kbn/embeddable-plugin/public';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import { ExternalLinkInput } from '../types';
import { ILinkFactory } from '../../navigation_container/types';
import { ExternalLinkEditor } from '../components/external_link_editor';
import { NavigationContainer } from '../../navigation_container/embeddable/navigation_container';

export const EXTERNAL_LINK_EMBEDDABLE_TYPE = 'navEmbeddable_externalLink';

export class ExternalLinkFactory
  implements EmbeddableFactoryDefinition, ILinkFactory<ExternalLinkInput>
{
  public type = EXTERNAL_LINK_EMBEDDABLE_TYPE;

  public async isEditable() {
    return true;
  }

  public canCreateNew() {
    return false;
  }

  public linkEditorComponent = ExternalLinkEditor;

  public async create(initialInput: ExternalLinkInput, parent: NavigationContainer) {
    const { ExternalLinkEmbeddable } = await import('./external_link_embeddable');
    const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();

    return Promise.resolve(
      new ExternalLinkEmbeddable(reduxEmbeddablePackage, initialInput, parent)
    );
  }

  public getDisplayName() {
    return i18n.translate('navigationEmbeddable.externalLink.factory.displayName', {
      defaultMessage: 'URL',
    });
  }

  public getDescription() {
    return i18n.translate('navigationEmbeddable.externalLink.factory.description', {
      defaultMessage: 'Go to URL',
    });
  }

  public getIconType() {
    return 'link';
  }
}
