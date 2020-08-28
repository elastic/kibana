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
import {
  EmbeddableInput,
  SavedObjectEmbeddableInput,
  isSavedObjectEmbeddableInput,
  IEmbeddable,
} from '../embeddable_plugin';
import {
  SavedObjectsClientContract,
  SimpleSavedObject,
  I18nStart,
  NotificationsStart,
  OverlayStart,
} from '../../../../core/public';
import {
  SavedObjectSaveModal,
  showSaveModal,
  OnSaveProps,
  SaveResult,
  checkForDuplicateTitle,
} from '../../../saved_objects/public';
import {
  EmbeddableStart,
  EmbeddableFactory,
  EmbeddableFactoryNotFoundError,
  Container,
} from '../../../embeddable/public';

/**
 * The attribute service is a shared, generic service that embeddables can use to provide the functionality
 * required to fulfill the requirements of the ReferenceOrValueEmbeddable interface. The attribute_service
 * can also be used as a higher level wrapper to transform an embeddable input shape that references a saved object
 * into an embeddable input shape that contains that saved object's attributes by value.
 */
export class AttributeService<
  SavedObjectAttributes extends { title: string },
  ValType extends EmbeddableInput & { attributes: SavedObjectAttributes },
  RefType extends SavedObjectEmbeddableInput
> {
  private embeddableFactory: EmbeddableFactory;

  constructor(
    private type: string,
    private savedObjectsClient: SavedObjectsClientContract,
    private overlays: OverlayStart,
    private i18nContext: I18nStart['Context'],
    private toasts: NotificationsStart['toasts'],
    getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory']
  ) {
    const factory = getEmbeddableFactory(this.type);
    if (!factory) {
      throw new EmbeddableFactoryNotFoundError(this.type);
    }
    this.embeddableFactory = factory;
  }

  public async unwrapAttributes(input: RefType | ValType): Promise<SavedObjectAttributes> {
    if (this.inputIsRefType(input)) {
      const savedObject: SimpleSavedObject<SavedObjectAttributes> = await this.savedObjectsClient.get<
        SavedObjectAttributes
      >(this.type, input.savedObjectId);
      return savedObject.attributes;
    }
    return input.attributes;
  }

  public async wrapAttributes(
    newAttributes: SavedObjectAttributes,
    useRefType: boolean,
    embeddable?: IEmbeddable
  ): Promise<Omit<ValType | RefType, 'id'>> {
    const savedObjectId =
      embeddable && isSavedObjectEmbeddableInput(embeddable.getInput())
        ? (embeddable.getInput() as SavedObjectEmbeddableInput).savedObjectId
        : undefined;
    if (!useRefType) {
      return { attributes: newAttributes } as ValType;
    } else {
      try {
        if (savedObjectId) {
          await this.savedObjectsClient.update(this.type, savedObjectId, newAttributes);
          return { savedObjectId } as RefType;
        } else {
          const savedItem = await this.savedObjectsClient.create(this.type, newAttributes);
          return { savedObjectId: savedItem.id } as RefType;
        }
      } catch (error) {
        this.toasts.addDanger({
          title: i18n.translate('dashboard.attributeService.saveToLibraryError', {
            defaultMessage: `Panel was not saved to the library. Error: {errorMessage}`,
            values: {
              errorMessage: error.message,
            },
          }),
          'data-test-subj': 'saveDashboardFailure',
        });
        return Promise.reject({ error });
      }
    }
  }

  inputIsRefType = (input: ValType | RefType): input is RefType => {
    return isSavedObjectEmbeddableInput(input);
  };

  public getExplicitInputFromEmbeddable(embeddable: IEmbeddable): ValType | RefType {
    return embeddable.getRoot() &&
      (embeddable.getRoot() as Container).getInput().panels[embeddable.id].explicitInput
      ? ((embeddable.getRoot() as Container).getInput().panels[embeddable.id].explicitInput as
          | ValType
          | RefType)
      : (embeddable.getInput() as ValType | RefType);
  }

  getInputAsValueType = async (input: ValType | RefType): Promise<ValType> => {
    if (!this.inputIsRefType(input)) {
      return input;
    }
    const attributes = await this.unwrapAttributes(input);
    return {
      ...input,
      savedObjectId: undefined,
      attributes,
    };
  };

  getInputAsRefType = async (
    input: ValType | RefType,
    saveOptions?: { showSaveModal: boolean } | { title: string }
  ): Promise<RefType> => {
    if (this.inputIsRefType(input)) {
      return input;
    }
    return new Promise<RefType>((resolve, reject) => {
      const onSave = async (props: OnSaveProps): Promise<SaveResult> => {
        await checkForDuplicateTitle(
          {
            title: props.newTitle,
            copyOnSave: false,
            lastSavedTitle: '',
            getEsType: () => this.type,
            getDisplayName: this.embeddableFactory.getDisplayName,
          },
          props.isTitleDuplicateConfirmed,
          props.onTitleDuplicate,
          {
            savedObjectsClient: this.savedObjectsClient,
            overlays: this.overlays,
          }
        );
        try {
          const newAttributes = { ...input.attributes };
          newAttributes.title = props.newTitle;
          const wrappedInput = (await this.wrapAttributes(newAttributes, true)) as RefType;
          resolve(wrappedInput);
          return { id: wrappedInput.savedObjectId };
        } catch (error) {
          reject(error);
          return { error };
        }
      };

      if (saveOptions && (saveOptions as { showSaveModal: boolean }).showSaveModal) {
        showSaveModal(
          <SavedObjectSaveModal
            onSave={onSave}
            onClose={() => reject()}
            title={input.attributes.title}
            showCopyOnSave={false}
            objectType={this.type}
            showDescription={false}
          />,
          this.i18nContext
        );
      }
    });
  };
}
