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
import { SavedObjectsClientContract, OverlayStart } from 'kibana/public';
import { BookSavedObjectAttributes, BOOK_SAVED_OBJECT } from '../../common';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import {
  IContainer,
  EmbeddableFactoryDefinition,
  EmbeddableStart,
  ErrorEmbeddable,
} from '../../../../src/plugins/embeddable/public';
import {
  BookEmbeddable,
  BOOK_EMBEDDABLE,
  BookEmbeddableInput,
  BookEmbeddableOutput,
} from './book_embeddable';
import { CreateEditBookComponent } from './create_edit_book_component';

interface StartServices {
  getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'];
  savedObjectsClient: SavedObjectsClientContract;
  openModal: OverlayStart['openModal'];
}

export class BookEmbeddableFactory
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

  constructor(private getStartServices: () => Promise<StartServices>) {}

  public async isEditable() {
    return true;
  }

  public createFromSavedObject = async (
    savedObjectId: string,
    input: BookEmbeddableInput,
    parent?: IContainer
  ): Promise<BookEmbeddable | ErrorEmbeddable> => {
    return this.create(input, parent);
  };

  public async create(input: BookEmbeddableInput, parent?: IContainer) {
    const { savedObjectsClient } = await this.getStartServices();
    return new BookEmbeddable(input, {
      parent,
      savedObjectsClient,
    });
  }

  public getDisplayName() {
    return i18n.translate('embeddableExamples.book.displayName', {
      defaultMessage: 'Book',
    });
  }

  /**
   * This function is used when dynamically creating a new embeddable to add to a
   * container that is not neccessarily backed by a saved object.
   */
  public async getExplicitInput(): Promise<{
    savedObjectId?: string;
    attributes?: BookSavedObjectAttributes;
  }> {
    const { openModal, savedObjectsClient } = await this.getStartServices();
    return new Promise<{
      savedObjectId?: string;
      attributes?: BookSavedObjectAttributes;
    }>((resolve) => {
      const onSave = async (attributes: BookSavedObjectAttributes, includeInLibrary: boolean) => {
        if (includeInLibrary) {
          const savedItem = await savedObjectsClient.create(BOOK_SAVED_OBJECT, attributes);
          resolve({ savedObjectId: savedItem.id });
        } else {
          resolve({ attributes });
        }
      };
      const overlay = openModal(
        toMountPoint(
          <CreateEditBookComponent
            onSave={(attributes: BookSavedObjectAttributes, includeInLibrary: boolean) => {
              onSave(attributes, includeInLibrary);
              overlay.close();
            }}
          />
        )
      );
    });
  }
}
