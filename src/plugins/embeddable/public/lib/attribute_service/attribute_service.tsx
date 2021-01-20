/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { I18nStart, NotificationsStart } from 'src/core/public';
import { SavedObjectSaveModal, OnSaveProps, SaveResult } from '../../../../saved_objects/public';
import {
  EmbeddableInput,
  SavedObjectEmbeddableInput,
  isSavedObjectEmbeddableInput,
  IEmbeddable,
  Container,
  EmbeddableFactoryNotFoundError,
  EmbeddableFactory,
} from '../index';

/**
 * The attribute service is a shared, generic service that embeddables can use to provide the functionality
 * required to fulfill the requirements of the ReferenceOrValueEmbeddable interface. The attribute_service
 * can also be used as a higher level wrapper to transform an embeddable input shape that references a saved object
 * into an embeddable input shape that contains that saved object's attributes by value.
 */
export const ATTRIBUTE_SERVICE_KEY = 'attributes';

export interface AttributeServiceOptions<A extends { title: string }> {
  saveMethod: (
    attributes: A,
    savedObjectId?: string
  ) => Promise<{ id?: string } | { error: Error }>;
  checkForDuplicateTitle: (props: OnSaveProps) => Promise<true>;
  unwrapMethod?: (savedObjectId: string) => Promise<A>;
}

export class AttributeService<
  SavedObjectAttributes extends { title: string },
  ValType extends EmbeddableInput & {
    [ATTRIBUTE_SERVICE_KEY]: SavedObjectAttributes;
  } = EmbeddableInput & { [ATTRIBUTE_SERVICE_KEY]: SavedObjectAttributes },
  RefType extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
> {
  constructor(
    private type: string,
    private showSaveModal: (
      saveModal: React.ReactElement,
      I18nContext: I18nStart['Context']
    ) => void,
    private i18nContext: I18nStart['Context'],
    private toasts: NotificationsStart['toasts'],
    private options: AttributeServiceOptions<SavedObjectAttributes>,
    getEmbeddableFactory?: (embeddableFactoryId: string) => EmbeddableFactory
  ) {
    if (getEmbeddableFactory) {
      const factory = getEmbeddableFactory(this.type);
      if (!factory) {
        throw new EmbeddableFactoryNotFoundError(this.type);
      }
    }
  }

  private async defaultUnwrapMethod(input: RefType): Promise<SavedObjectAttributes> {
    return new Promise<SavedObjectAttributes>((resolve) => {
      // @ts-ignore
      return resolve({ ...input });
    });
  }

  public async unwrapAttributes(input: RefType | ValType): Promise<SavedObjectAttributes> {
    if (this.inputIsRefType(input)) {
      return this.options.unwrapMethod
        ? await this.options.unwrapMethod(input.savedObjectId)
        : await this.defaultUnwrapMethod(input);
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
      const savedItem = await this.options.saveMethod(newAttributes, savedObjectId);
      if ('id' in savedItem) {
        return { ...originalInput, savedObjectId: savedItem.id } as RefType;
      }
      return { ...originalInput } as RefType;
    } catch (error) {
      this.toasts.addDanger({
        title: i18n.translate('embeddableApi.attributeService.saveToLibraryError', {
          defaultMessage: `An error occurred while saving. Error: {errorMessage}`,
          values: {
            errorMessage: error.message,
          },
        }),
        'data-test-subj': 'attributeServiceSaveFailure',
      });
      return Promise.reject({ error });
    }
  }

  inputIsRefType = (input: ValType | RefType): input is RefType => {
    return isSavedObjectEmbeddableInput(input);
  };

  public getExplicitInputFromEmbeddable(embeddable: IEmbeddable): ValType | RefType {
    return ((embeddable.getRoot() as Container).getInput()?.panels?.[embeddable.id]
      ?.explicitInput ?? embeddable.getInput()) as ValType | RefType;
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
        await this.options.checkForDuplicateTitle(props);
        try {
          const newAttributes = { ...input[ATTRIBUTE_SERVICE_KEY] };
          newAttributes.title = props.newTitle;
          const wrappedInput = (await this.wrapAttributes(newAttributes, true)) as RefType;

          // Remove unneeded attributes from the original input.
          delete (input as { [ATTRIBUTE_SERVICE_KEY]?: SavedObjectAttributes })[
            ATTRIBUTE_SERVICE_KEY
          ];

          // Combine input and wrapped input to preserve any passed in explicit Input.
          resolve({ ...input, ...wrappedInput });
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
