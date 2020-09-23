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
import { get } from 'lodash';
import {
  EmbeddableInput,
  SavedObjectEmbeddableInput,
  isSavedObjectEmbeddableInput,
  IEmbeddable,
  Container,
  EmbeddableStart,
  EmbeddableFactory,
  EmbeddableFactoryNotFoundError,
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
  OnSaveProps,
  SaveResult,
  checkForDuplicateTitle,
} from '../../../saved_objects/public';

/**
 * The attribute service is a shared, generic service that embeddables can use to provide the functionality
 * required to fulfill the requirements of the ReferenceOrValueEmbeddable interface. The attribute_service
 * can also be used as a higher level wrapper to transform an embeddable input shape that references a saved object
 * into an embeddable input shape that contains that saved object's attributes by value.
 */
export const ATTRIBUTE_SERVICE_KEY = 'attributes';

export interface AttributeServiceOptions<A extends { title: string }> {
  saveMethod: (
    type: string,
    attributes: A,
    savedObjectId?: string
  ) => Promise<{ id?: string } | { error: Error }>;
  customUnwrapMethod?: (savedObject: SimpleSavedObject<A>) => A;
}

export class AttributeService<
  SavedObjectAttributes extends { title: string },
  ValType extends EmbeddableInput & {
    [ATTRIBUTE_SERVICE_KEY]: SavedObjectAttributes;
  } = EmbeddableInput & { [ATTRIBUTE_SERVICE_KEY]: SavedObjectAttributes },
  RefType extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
> {
  private embeddableFactory?: EmbeddableFactory;

  constructor(
    private type: string,
    private showSaveModal: (
      saveModal: React.ReactElement,
      I18nContext: I18nStart['Context']
    ) => void,
    private savedObjectsClient: SavedObjectsClientContract,
    private overlays: OverlayStart,
    private i18nContext: I18nStart['Context'],
    private toasts: NotificationsStart['toasts'],
    getEmbeddableFactory?: EmbeddableStart['getEmbeddableFactory'],
    private options?: AttributeServiceOptions<SavedObjectAttributes>
  ) {
    if (getEmbeddableFactory) {
      const factory = getEmbeddableFactory(this.type);
      if (!factory) {
        throw new EmbeddableFactoryNotFoundError(this.type);
      }
      this.embeddableFactory = factory;
    }
  }

  public async unwrapAttributes(input: RefType | ValType): Promise<SavedObjectAttributes> {
    if (this.inputIsRefType(input)) {
      const savedObject: SimpleSavedObject<SavedObjectAttributes> = await this.savedObjectsClient.get<
        SavedObjectAttributes
      >(this.type, input.savedObjectId);
      return this.options?.customUnwrapMethod
        ? this.options?.customUnwrapMethod(savedObject)
        : { ...savedObject.attributes };
    }
    return input[ATTRIBUTE_SERVICE_KEY];
  }

  public async wrapAttributes(
    newAttributes: SavedObjectAttributes,
    useRefType: boolean,
    input?: ValType | RefType
  ): Promise<Omit<ValType | RefType, 'id'>> {
    const originalInput = input ? input : {};
    const savedObjectId =
      input && this.inputIsRefType(input)
        ? (input as SavedObjectEmbeddableInput).savedObjectId
        : undefined;
    if (!useRefType) {
      return { [ATTRIBUTE_SERVICE_KEY]: newAttributes } as ValType;
    }
    try {
      const savedItem = await this.options.saveMethod(this.type, newAttributes, savedObjectId);
      if ('id' in savedItem) {
        return { ...originalInput, savedObjectId: savedItem.id } as RefType;
      }
      return { ...originalInput } as RefType;
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
    saveOptions?: { showSaveModal: boolean; saveModalTitle?: string } | { title: string }
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
            getDisplayName: this.embeddableFactory?.getDisplayName || (() => this.type),
          },
          props.isTitleDuplicateConfirmed,
          props.onTitleDuplicate,
          {
            savedObjectsClient: this.savedObjectsClient,
            overlays: this.overlays,
          }
        );
        try {
          const newAttributes = { ...input[ATTRIBUTE_SERVICE_KEY] };
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
        this.showSaveModal(
          <SavedObjectSaveModal
            onSave={onSave}
            onClose={() => reject()}
            title={get(saveOptions, 'saveModalTitle', input[ATTRIBUTE_SERVICE_KEY].title)}
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
