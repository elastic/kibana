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
import { LinksAttributes } from '../../common/content_management';
import { extractReferences, injectReferences } from '../../common/persistable_state';
import { LinksByReferenceInput, LinksByValueInput } from '../embeddable/types';
import { embeddableService } from './kibana_services';
import { checkForDuplicateTitle, linksClient } from '../content_management';
import { CONTENT_ID } from '../../common';

export type LinksDocument = LinksAttributes & {
  references?: Reference[];
};

export interface LinksUnwrapMetaInfo {
  sharingSavedObjectProps?: SharingSavedObjectProps;
}

export type LinksAttributeService = AttributeService<
  LinksDocument,
  LinksByValueInput,
  LinksByReferenceInput,
  LinksUnwrapMetaInfo
>;

let linksAttributeService: LinksAttributeService | null = null;
export function getLinksAttributeService(): LinksAttributeService {
  if (linksAttributeService) return linksAttributeService;

  linksAttributeService = embeddableService.getAttributeService<
    LinksDocument,
    LinksByValueInput,
    LinksByReferenceInput,
    LinksUnwrapMetaInfo
  >(CONTENT_ID, {
    saveMethod: async (attributes: LinksDocument, savedObjectId?: string) => {
      const { attributes: updatedAttributes, references } = extractReferences({
        attributes,
        references: attributes.references,
      });
      const {
        item: { id },
      } = await (savedObjectId
        ? linksClient.update({
            id: savedObjectId,
            data: updatedAttributes,
            options: { references },
          })
        : linksClient.create({ data: updatedAttributes, options: { references } }));
      return { id };
    },
    unwrapMethod: async (
      savedObjectId: string
    ): Promise<{
      attributes: LinksDocument;
      metaInfo: LinksUnwrapMetaInfo;
    }> => {
      const {
        item: savedObject,
        meta: { outcome, aliasPurpose, aliasTargetId },
      } = await linksClient.get(savedObjectId);
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
  return linksAttributeService;
}
