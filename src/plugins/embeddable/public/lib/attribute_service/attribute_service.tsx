/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { get, omit } from 'lodash';
import { I18nStart, NotificationsStart } from 'src/core/public';
import { SavedObjectSaveModal, OnSaveProps, SaveResult } from '../../../../saved_objects/public';
import {
  EmbeddableInput,
  SavedObjectEmbeddableInput,
  isSavedObjectEmbeddableInput,
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

export interface GenericAttributes {
  title: string;
}
export interface AttributeServiceUnwrapResult<
  SavedObjectAttributes extends GenericAttributes,
  MetaInfo extends unknown = unknown
> {
  attributes: SavedObjectAttributes;
  metaInfo?: MetaInfo;
}
export interface AttributeServiceOptions<
  SavedObjectAttributes extends GenericAttributes,
  MetaInfo extends unknown = unknown
> {
  saveMethod: (
    attributes: SavedObjectAttributes,
    savedObjectId?: string
  ) => Promise<{ id?: string } | { error: Error }>;
  checkForDuplicateTitle: (props: OnSaveProps) => Promise<true>;
  unwrapMethod?: (
    savedObjectId: string
  ) => Promise<AttributeServiceUnwrapResult<SavedObjectAttributes, MetaInfo>>;
}

export class AttributeService<
  SavedObjectAttributes extends { title: string },
  ValType extends EmbeddableInput & {
    [ATTRIBUTE_SERVICE_KEY]: SavedObjectAttributes;
  } = EmbeddableInput & { [ATTRIBUTE_SERVICE_KEY]: SavedObjectAttributes },
  RefType extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput,
  MetaInfo extends unknown = unknown
> {
  constructor(
    private type: string,
    private showSaveModal: (
      saveModal: React.ReactElement,
      I18nContext: I18nStart['Context']
    ) => void,
    private i18nContext: I18nStart['Context'],
    private toasts: NotificationsStart['toasts'],
    private options: AttributeServiceOptions<SavedObjectAttributes, MetaInfo>,
    getEmbeddableFactory?: (embeddableFactoryId: string) => EmbeddableFactory
  ) {
    if (getEmbeddableFactory) {
      const factory = getEmbeddableFactory(this.type);
      if (!factory) {
        throw new EmbeddableFactoryNotFoundError(this.type);
      }
    }
  }

  private async defaultUnwrapMethod(
    input: RefType
  ): Promise<AttributeServiceUnwrapResult<SavedObjectAttributes, MetaInfo>> {
    return Promise.resolve({ attributes: { ...(input as unknown as SavedObjectAttributes) } });
  }

  public async unwrapAttributes(
    input: RefType | ValType
  ): Promise<AttributeServiceUnwrapResult<SavedObjectAttributes, MetaInfo>> {
    if (this.inputIsRefType(input)) {
      return this.options.unwrapMethod
        ? await this.options.unwrapMethod(input.savedObjectId)
        : await this.defaultUnwrapMethod(input);
    }
    return { attributes: (input as ValType)[ATTRIBUTE_SERVICE_KEY] };
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

  getInputAsValueType = async (input: ValType | RefType): Promise<ValType> => {
    if (!this.inputIsRefType(input)) {
      return input as ValType;
    }
    const { attributes } = await this.unwrapAttributes(input);
    const libraryTitle = attributes.title;
    const { savedObjectId, ...originalInputToPropagate } = input;

    return {
      ...originalInputToPropagate,
      // by value visualizations should not have default titles and/or descriptions
      ...{ attributes: omit(attributes, ['title', 'description']) },
      title: libraryTitle,
    } as unknown as ValType;
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
          const newAttributes = { ...(input as ValType)[ATTRIBUTE_SERVICE_KEY] };
          newAttributes.title = props.newTitle;
          const wrappedInput = (await this.wrapAttributes(
            newAttributes,
            true
          )) as unknown as RefType;
          // Remove unneeded attributes from the original input. Note that the original panel title
          // is removed in favour of the new attributes title
          const newInput = omit(input, [ATTRIBUTE_SERVICE_KEY, 'title']);

          // Combine input and wrapped input to preserve any passed in explicit Input
          resolve({ ...newInput, ...wrappedInput });
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
            title={get(
              saveOptions,
              'saveModalTitle',
              (input as ValType)[ATTRIBUTE_SERVICE_KEY].title
            )}
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
