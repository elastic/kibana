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
import { get, omit } from 'lodash';
import {
  SavedObjectSaveModal,
  OnSaveProps,
  SaveResult,
  showSaveModal,
} from '@kbn/saved-objects-plugin/public';
import { getNotifications } from '../../services';
import {
  VisualizeByReferenceInput,
  VisualizeByValueInput,
  VisualizeSavedObjectAttributes,
} from './visualize_embeddable';

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
export interface AttributeServiceUnwrapResult {
  attributes: VisualizeSavedObjectAttributes;
  metaInfo?: unknown;
}
export interface AttributeServiceOptions {
  saveMethod: (
    attributes: VisualizeSavedObjectAttributes,
    savedObjectId?: string
  ) => Promise<{ id?: string } | { error: Error }>;
  checkForDuplicateTitle: (props: OnSaveProps) => Promise<boolean>;
  unwrapMethod?: (savedObjectId: string) => Promise<AttributeServiceUnwrapResult>;
}

export class AttributeService {
  constructor(private type: string, private options: AttributeServiceOptions) {}

  private async defaultUnwrapMethod(
    input: VisualizeByReferenceInput
  ): Promise<AttributeServiceUnwrapResult> {
    return Promise.resolve({
      attributes: { ...(input as unknown as VisualizeSavedObjectAttributes) },
    });
  }

  public async unwrapAttributes(
    input: VisualizeByReferenceInput | VisualizeByValueInput
  ): Promise<AttributeServiceUnwrapResult> {
    if (this.inputIsRefType(input)) {
      return this.options.unwrapMethod
        ? await this.options.unwrapMethod(input.savedObjectId)
        : await this.defaultUnwrapMethod(input);
    }
    return { attributes: (input as VisualizeByValueInput)[ATTRIBUTE_SERVICE_KEY] };
  }

  public async wrapAttributes(
    newAttributes: VisualizeSavedObjectAttributes,
    useRefType: boolean,
    input?: VisualizeByValueInput | VisualizeByReferenceInput
  ): Promise<Omit<VisualizeByValueInput | VisualizeByReferenceInput, 'id'>> {
    const originalInput = input ? input : {};
    const savedObjectId = input && this.inputIsRefType(input) ? input.savedObjectId : undefined;
    if (!useRefType) {
      return { [ATTRIBUTE_SERVICE_KEY]: newAttributes } as VisualizeByValueInput;
    }
    try {
      const savedItem = await this.options.saveMethod(newAttributes, savedObjectId);
      if ('id' in savedItem) {
        return { ...originalInput, savedObjectId: savedItem.id } as VisualizeByReferenceInput;
      }
      return { ...originalInput } as VisualizeByReferenceInput;
    } catch (error) {
      getNotifications().toasts.addDanger({
        title: i18n.translate('visualizations.attributeService.saveToLibraryError', {
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

  inputIsRefType = (
    input: VisualizeByValueInput | VisualizeByReferenceInput
  ): input is VisualizeByReferenceInput => {
    return Boolean((input as VisualizeByReferenceInput).savedObjectId);
  };

  getInputAsValueType = async (
    input: VisualizeByValueInput | VisualizeByReferenceInput
  ): Promise<VisualizeByValueInput> => {
    if (!this.inputIsRefType(input)) {
      return input as VisualizeByValueInput;
    }
    const { attributes } = await this.unwrapAttributes(input);
    const { savedObjectId, ...originalInputToPropagate } = input;

    return {
      ...originalInputToPropagate,
      // by value visualizations should not have default titles and/or descriptions
      ...{ attributes: omit(attributes, ['title', 'description']) },
    } as unknown as VisualizeByValueInput;
  };

  getInputAsRefType = async (
    input: VisualizeByValueInput | VisualizeByReferenceInput,
    saveOptions?: { showSaveModal: boolean; saveModalTitle?: string } | { title: string }
  ): Promise<VisualizeByReferenceInput> => {
    if (this.inputIsRefType(input)) {
      return input;
    }
    return new Promise<VisualizeByReferenceInput>((resolve, reject) => {
      const onSave = async (props: OnSaveProps): Promise<SaveResult> => {
        await this.options.checkForDuplicateTitle(props);
        try {
          const newAttributes = { ...(input as VisualizeByValueInput)[ATTRIBUTE_SERVICE_KEY] };
          newAttributes.title = props.newTitle;
          const wrappedInput = (await this.wrapAttributes(
            newAttributes,
            true
          )) as unknown as VisualizeByReferenceInput;
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
        showSaveModal(
          <SavedObjectSaveModal
            onSave={onSave}
            onClose={() => {}}
            title={get(
              saveOptions,
              'saveModalTitle',
              (input as VisualizeByValueInput)[ATTRIBUTE_SERVICE_KEY].title
            )}
            showCopyOnSave={false}
            objectType={this.type}
            showDescription={false}
          />
        );
      }
    });
  };
}
