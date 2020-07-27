/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { BookSavedObjectAttributes, BOOK_SAVED_OBJECT } from '../../common';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import {
  EmbeddableFactoryDefinition,
  EmbeddableStart,
  IContainer,
  AttributeService,
  EmbeddableFactory,
} from '../../../../src/plugins/embeddable/public';
import {
  BookEmbeddable,
  BOOK_EMBEDDABLE,
  BookEmbeddableInput,
  BookEmbeddableOutput,
  BookByValueInput,
  BookByReferenceInput,
} from './book_embeddable';
import { CreateEditBookComponent } from './create_edit_book_component';
import { OverlayStart } from '../../../../src/core/public';

interface StartServices {
  getAttributeService: EmbeddableStart['getAttributeService'];
  openModal: OverlayStart['openModal'];
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
    > {
  public readonly type = BOOK_EMBEDDABLE;
  public savedObjectMetaData = {
    name: 'Book',
    includeFields: ['title', 'author', 'readIt'],
    type: BOOK_SAVED_OBJECT,
    getIconForSavedObject: () => 'pencil',
  };

  private attributeService?: AttributeService<
    BookSavedObjectAttributes,
    BookByValueInput,
    BookByReferenceInput
  >;

  constructor(private getStartServices: () => Promise<StartServices>) {}

  public async isEditable() {
    return true;
  }

  public async create(input: BookEmbeddableInput, parent?: IContainer) {
    return new BookEmbeddable(input, await this.getAttributeService(), {
      parent,
    });
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

  private async getAttributeService() {
    if (!this.attributeService) {
      this.attributeService = await (await this.getStartServices()).getAttributeService<
        BookSavedObjectAttributes,
        BookByValueInput,
        BookByReferenceInput
      >(this.type);
    }
    return this.attributeService;
  }
}
