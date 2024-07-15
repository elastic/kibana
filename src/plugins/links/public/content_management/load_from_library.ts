/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { injectReferences } from '../../common/persistable_state';
import { linksClient } from './links_content_management_client';

export async function loadFromLibrary(savedObjectId: string) {
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
}
