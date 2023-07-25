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
import {
  NavigationEmbeddableByReferenceInput,
  NavigationEmbeddableByValueInput,
} from '../embeddable/types';
import { embeddableService } from './kibana_services';
import { navigationEmbeddableClient } from '../content_management';
import { NAVIGATION_EMBEDDABLE_TYPE } from '../../common/constants';

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
  >(NAVIGATION_EMBEDDABLE_TYPE, {
    saveMethod: async (attributes: NavigationEmbeddableDocument, savedObjectId?: string) => {
      // TODO extract references
      const {
        item: { id },
      } = await (savedObjectId
        ? navigationEmbeddableClient.update({ id: savedObjectId, data: attributes })
        : navigationEmbeddableClient.create({ data: attributes, options: { references: [] } }));
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

      // TODO inject references
      const attributes = savedObject.attributes;
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
      return Promise.resolve(false);
    },
  });
  return navigationEmbeddableAttributeService;
}
