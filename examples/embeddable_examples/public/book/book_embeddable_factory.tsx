/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { BookSavedObjectAttributes, BOOK_SAVED_OBJECT } from '../../common';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import {
  EmbeddableFactoryDefinition,
  IContainer,
  EmbeddableFactory,
  EmbeddableStart,
  AttributeService,
} from '../../../../src/plugins/embeddable/public';
import {
  BookEmbeddable,
  BOOK_EMBEDDABLE,
  BookEmbeddableInput,
  BookEmbeddableOutput,
} from './book_embeddable';
import { CreateEditBookComponent } from './create_edit_book_component';
import {
  OverlayStart,
  SavedObjectsClientContract,
  SimpleSavedObject,
} from '../../../../src/core/public';
import { checkForDuplicateTitle, OnSaveProps } from '../../../../src/plugins/saved_objects/public';

interface StartServices {
  getAttributeService: EmbeddableStart['getAttributeService'];
  openModal: OverlayStart['openModal'];
  savedObjectsClient: SavedObjectsClientContract;
  overlays: OverlayStart;
}

export type BookEmbeddableFactory = EmbeddableFactory<
  BookEmbeddableInput,
  BookEmbeddableOutput,
  BookEmbeddable,
  BookSavedObjectAttributes
>;

export class BookEmbeddableFactoryDefinition
  implements
    EmbeddableFactoryDefinition<
      BookEmbeddableInput,
      BookEmbeddableOutput,
      BookEmbeddable,
      BookSavedObjectAttributes
    >
{
  public readonly type = BOOK_EMBEDDABLE;
  public savedObjectMetaData = {
    name: 'Book',
    includeFields: ['title', 'author', 'readIt'],
    type: BOOK_SAVED_OBJECT,
    getIconForSavedObject: () => 'pencil',
  };

  private attributeService?: AttributeService<BookSavedObjectAttributes>;

  constructor(private getStartServices: () => Promise<StartServices>) {}

  public async isEditable() {
    return true;
  }

  public async create(input: BookEmbeddableInput, parent?: IContainer) {
    return new BookEmbeddable(input, await this.getAttributeService(), {
      parent,
    });
  }

  // This is currently required due to the distinction in container.ts and the
  // default error implementation in default_embeddable_factory_provider.ts
  public async createFromSavedObject(
    savedObjectId: string,
    input: BookEmbeddableInput,
    parent?: IContainer
  ) {
    return this.create(input, parent);
  }

  public getDisplayName() {
    return i18n.translate('embeddableExamples.book.displayName', {
      defaultMessage: 'Book',
    });
  }

  public async getExplicitInput(): Promise<Omit<BookEmbeddableInput, 'id'>> {
    const { openModal } = await this.getStartServices();
    return new Promise<Omit<BookEmbeddableInput, 'id'>>((resolve) => {
      const onSave = async (attributes: BookSavedObjectAttributes, useRefType: boolean) => {
        const wrappedAttributes = (await this.getAttributeService()).wrapAttributes(
          attributes,
          useRefType
        );
        resolve(wrappedAttributes);
      };
      const overlay = openModal(
        toMountPoint(
          <CreateEditBookComponent
            onSave={(attributes: BookSavedObjectAttributes, useRefType: boolean) => {
              onSave(attributes, useRefType);
              overlay.close();
            }}
          />
        )
      );
    });
  }

  private async unwrapMethod(
    savedObjectId: string
  ): Promise<{ attributes: BookSavedObjectAttributes }> {
    const { savedObjectsClient } = await this.getStartServices();
    const savedObject: SimpleSavedObject<BookSavedObjectAttributes> =
      await savedObjectsClient.get<BookSavedObjectAttributes>(this.type, savedObjectId);
    return { attributes: { ...savedObject.attributes } };
  }

  private async saveMethod(attributes: BookSavedObjectAttributes, savedObjectId?: string) {
    const { savedObjectsClient } = await this.getStartServices();
    if (savedObjectId) {
      return savedObjectsClient.update(this.type, savedObjectId, attributes);
    }
    return savedObjectsClient.create(this.type, attributes);
  }

  private async checkForDuplicateTitleMethod(props: OnSaveProps): Promise<true> {
    const start = await this.getStartServices();
    const { savedObjectsClient, overlays } = start;
    return checkForDuplicateTitle(
      {
        title: props.newTitle,
        copyOnSave: false,
        lastSavedTitle: '',
        getEsType: () => this.type,
        getDisplayName: this.getDisplayName || (() => this.type),
      },
      props.isTitleDuplicateConfirmed,
      props.onTitleDuplicate,
      {
        savedObjectsClient,
        overlays,
      }
    );
  }

  private async getAttributeService() {
    if (!this.attributeService) {
      this.attributeService = (
        await this.getStartServices()
      ).getAttributeService<BookSavedObjectAttributes>(this.type, {
        saveMethod: this.saveMethod.bind(this),
        unwrapMethod: this.unwrapMethod.bind(this),
        checkForDuplicateTitle: this.checkForDuplicateTitleMethod.bind(this),
      });
    }
    return this.attributeService!;
  }
}
