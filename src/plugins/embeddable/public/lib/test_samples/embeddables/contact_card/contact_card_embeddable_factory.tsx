/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';

import { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EmbeddableFactoryDefinition } from '../../../embeddables';
import { Container } from '../../../containers';
import { ContactCardEmbeddable, ContactCardEmbeddableInput } from './contact_card_embeddable';
import { ContactCardInitializer } from './contact_card_initializer';

export const CONTACT_CARD_EMBEDDABLE = 'CONTACT_CARD_EMBEDDABLE';

export class ContactCardEmbeddableFactory
  implements EmbeddableFactoryDefinition<ContactCardEmbeddableInput>
{
  public readonly type = CONTACT_CARD_EMBEDDABLE;
  savedObjectMetaData = {
    name: 'Contact card',
    type: CONTACT_CARD_EMBEDDABLE,
    getIconForSavedObject: () => 'document',
  };

  constructor(
    protected readonly execTrigger: UiActionsStart['executeTriggerActions'],
    private readonly core: CoreStart
  ) {}

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.samples.contactCard.displayName', {
      defaultMessage: 'contact card',
    });
  }

  public getDefaultInput() {
    return {};
  }

  public getExplicitInput = (): Promise<Partial<ContactCardEmbeddableInput>> => {
    return new Promise((resolve) => {
      const modalSession = this.core.overlays.openModal(
        toMountPoint(
          <ContactCardInitializer
            onCancel={() => {
              modalSession.close();
              // @ts-expect-error
              resolve(undefined);
            }}
            onCreate={(input: { firstName: string; lastName?: string }) => {
              modalSession.close();
              resolve(input);
            }}
          />,
          this.core
        ),
        {
          'data-test-subj': 'createContactCardEmbeddable',
        }
      );
    });
  };

  public create = async (initialInput: ContactCardEmbeddableInput, parent?: Container) => {
    return new ContactCardEmbeddable(
      initialInput,
      {
        execAction: this.execTrigger,
      },
      parent
    );
  };
}
