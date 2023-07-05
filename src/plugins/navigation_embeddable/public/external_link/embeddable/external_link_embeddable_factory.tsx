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

import { ILinkFactory } from '../../navigation_container/types';
import { ExternalLinkInput } from '../types';
import { NavigationContainer } from '../../navigation_container/embeddable/navigation_container';
import { ExternalLinkEditorDestinationPicker } from '../components/external_link_editor_destination_picker';

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

  public linkEditorDestinationComponent = ExternalLinkEditorDestinationPicker;

  public async create(initialInput: ExternalLinkInput, parent: NavigationContainer) {
    const { ExternalLinkEmbeddable } = await import('./external_link_embeddable');
    const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();

    return Promise.resolve(
      new ExternalLinkEmbeddable(reduxEmbeddablePackage, initialInput, parent)
    );
  }

  public getDisplayName() {
    return i18n.translate('externalLinkEmbeddable.factory.displayName', {
      defaultMessage: 'URL',
    });
  }

  public getDescription() {
    return i18n.translate('externalLinkEmbeddable.factory.description', {
      defaultMessage: 'Go to URL',
    });
  }

  public getIconType() {
    return 'link';
  }
}
