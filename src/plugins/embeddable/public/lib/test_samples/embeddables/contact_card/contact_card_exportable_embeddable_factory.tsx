/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { UiActionsStart } from 'src/plugins/ui_actions/public';

import { CoreStart } from 'src/core/public';
import { toMountPoint } from '../../../../../../kibana_react/public';
import { EmbeddableFactoryDefinition } from '../../../embeddables';
import { Container } from '../../../containers';
import { ContactCardEmbeddableInput } from './contact_card_embeddable';
import { ContactCardExportableEmbeddable } from './contact_card_exportable_embeddable';
import { ContactCardInitializer } from './contact_card_initializer';

export const CONTACT_CARD_EXPORTABLE_EMBEDDABLE = 'CONTACT_CARD_EXPORTABLE_EMBEDDABLE';

export class ContactCardExportableEmbeddableFactory
  implements EmbeddableFactoryDefinition<ContactCardEmbeddableInput> {
  public readonly type = CONTACT_CARD_EXPORTABLE_EMBEDDABLE;

  constructor(
    private readonly execTrigger: UiActionsStart['executeTriggerActions'],
    private readonly overlays: CoreStart['overlays']
  ) {}

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.samples.contactCard.displayName', {
      defaultMessage: 'contact card',
    });
  }

  public getExplicitInput = (): Promise<Partial<ContactCardEmbeddableInput>> => {
    return new Promise((resolve) => {
      const modalSession = this.overlays.openModal(
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
          />
        ),
        {
          'data-test-subj': 'createContactCardEmbeddable',
        }
      );
    });
  };

  public create = async (initialInput: ContactCardEmbeddableInput, parent?: Container) => {
    return new ContactCardExportableEmbeddable(
      initialInput,
      {
        execAction: this.execTrigger,
      },
      parent
    );
  };
}
