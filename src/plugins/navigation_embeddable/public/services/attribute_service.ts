/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import { AttributeService } from '@kbn/embeddable-plugin/public';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { SharingSavedObjectProps } from '../../common/types';
import { NavigationEmbeddableAttributes } from '../../common/content_management';
import { extractReferences, injectReferences } from '../../common/persistable_state';
import {
  NavigationEmbeddableByReferenceInput,
  NavigationEmbeddableByValueInput,
} from '../embeddable/types';
import { embeddableService } from './kibana_services';
import { checkForDuplicateTitle, navigationEmbeddableClient } from '../content_management';
import { CONTENT_ID } from '../../common';

export type NavigationEmbeddableDocument = NavigationEmbeddableAttributes & {
  references?: Reference[];
};

export interface NavigationEmbeddableUnwrapMetaInfo {
  sharingSavedObjectProps?: SharingSavedObjectProps;
}

export type NavigationEmbeddableAttributeService = AttributeService<
  NavigationEmbeddableDocument,
  NavigationEmbeddableByValueInput,
  NavigationEmbeddableByReferenceInput,
  NavigationEmbeddableUnwrapMetaInfo
>;

let navigationEmbeddableAttributeService: NavigationEmbeddableAttributeService | null = null;
export function getNavigationEmbeddableAttributeService(): NavigationEmbeddableAttributeService {
  if (navigationEmbeddableAttributeService) return navigationEmbeddableAttributeService;

  navigationEmbeddableAttributeService = embeddableService.getAttributeService<
    NavigationEmbeddableDocument,
    NavigationEmbeddableByValueInput,
    NavigationEmbeddableByReferenceInput,
    NavigationEmbeddableUnwrapMetaInfo
  >(CONTENT_ID, {
    saveMethod: async (attributes: NavigationEmbeddableDocument, savedObjectId?: string) => {
      const { attributes: updatedAttributes, references } = extractReferences({
        attributes,
        references: attributes.references,
      });
      const {
        item: { id },
      } = await (savedObjectId
        ? navigationEmbeddableClient.update({
            id: savedObjectId,
            data: updatedAttributes,
            options: { references },
          })
        : navigationEmbeddableClient.create({ data: updatedAttributes, options: { references } }));
      return { id };
    },
    unwrapMethod: async (
      savedObjectId: string
    ): Promise<{
      attributes: NavigationEmbeddableDocument;
      metaInfo: NavigationEmbeddableUnwrapMetaInfo;
    }> => {
      const {
        item: savedObject,
        meta: { outcome, aliasPurpose, aliasTargetId },
      } = await navigationEmbeddableClient.get(savedObjectId);
      if (savedObject.error) throw savedObject.error;

      const { attributes } = injectReferences(savedObject);
      return {
        attributes,
        metaInfo: {
          sharingSavedObjectProps: {
            aliasTargetId,
            outcome,
            aliasPurpose,
            sourceId: savedObjectId,
          },
        },
      };
    },
    checkForDuplicateTitle: (props: OnSaveProps) => {
      return checkForDuplicateTitle({
        title: props.newTitle,
        copyOnSave: false,
        lastSavedTitle: '',
        isTitleDuplicateConfirmed: props.isTitleDuplicateConfirmed,
        onTitleDuplicate: props.onTitleDuplicate,
      });
    },
  });
  return navigationEmbeddableAttributeService;
}
