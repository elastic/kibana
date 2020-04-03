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
import { NoteSavedObjectAttributes, NOTE_SAVED_OBJECT } from '../../common';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import {
  IContainer,
  SavedObjectEmbeddableFactoryDefinition,
  EmbeddableStart,
  ErrorEmbeddable,
} from '../../../../src/plugins/embeddable/public';
import {
  NoteEmbeddable,
  NOTE_EMBEDDABLE,
  NoteEmbeddableInput,
  NoteEmbeddableOutput,
} from './note_embeddable';
import { CreateEditNoteComponent } from './create_edit_note_component';

interface StartServices {
  getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'];
  savedObjectsClient: SavedObjectsClientContract;
  openModal: OverlayStart['openModal'];
}

export class NoteEmbeddableFactory
  implements
    SavedObjectEmbeddableFactoryDefinition<
      NoteEmbeddableInput,
      NoteEmbeddableOutput,
      NoteEmbeddable,
      NoteSavedObjectAttributes
    > {
  public readonly type = NOTE_EMBEDDABLE;
  public savedObjectMetaData = {
    name: 'Note',
    includeFields: ['to', 'from', 'message'],
    type: NOTE_SAVED_OBJECT,
    getIconForSavedObject: () => 'pencil',
  };

  constructor(private getStartServices: () => Promise<StartServices>) {}

  public async isEditable() {
    return true;
  }

  public createFromSavedObject = async (
    savedObjectId: string,
    input: Partial<NoteEmbeddableInput> & { id: string },
    parent?: IContainer
  ): Promise<NoteEmbeddable | ErrorEmbeddable> => {
    const { savedObjectsClient } = await this.getStartServices();
    const todoSavedObject = await savedObjectsClient.get<NoteSavedObjectAttributes>(
      'todo',
      savedObjectId
    );
    return this.create({ ...input, savedObjectId, attributes: todoSavedObject.attributes }, parent);
  };

  public async create(input: NoteEmbeddableInput, parent?: IContainer) {
    const { savedObjectsClient } = await this.getStartServices();
    return new NoteEmbeddable(input, {
      parent,
      savedObjectsClient,
    });
  }

  public getDisplayName() {
    return i18n.translate('embeddableExamples.note.displayName', {
      defaultMessage: 'Note',
    });
  }

  /**
   * This function is used when dynamically creating a new embeddable to add to a
   * container that is not neccessarily backed by a saved object.
   */
  public async getExplicitInput(): Promise<{
    savedObjectId?: string;
    attributes?: NoteSavedObjectAttributes;
  }> {
    const { openModal, savedObjectsClient } = await this.getStartServices();
    return new Promise<{
      savedObjectId?: string;
      attributes?: NoteSavedObjectAttributes;
    }>(resolve => {
      const onSave = async (attributes: NoteSavedObjectAttributes, includeInLibrary: boolean) => {
        if (includeInLibrary) {
          const savedItem = await savedObjectsClient.create(NOTE_SAVED_OBJECT, attributes);
          resolve({ savedObjectId: savedItem.id });
        } else {
          resolve({ attributes });
        }
      };
      const overlay = openModal(
        toMountPoint(
          <CreateEditNoteComponent
            onSave={(attributes: NoteSavedObjectAttributes, includeInLibrary: boolean) => {
              onSave(attributes, includeInLibrary);
              overlay.close();
            }}
          />
        )
      );
    });
  }
}
