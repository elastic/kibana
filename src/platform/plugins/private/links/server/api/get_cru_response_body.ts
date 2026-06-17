/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMeta } from '@kbn/as-code-shared-schemas';
import { toAsCodeTags } from '@kbn/as-code-shared-transforms';
import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core/server';
import { transformOut } from '../../common/embeddable/transforms/transform_out';
import type { StoredLinksState } from '../links_saved_object';
import { linksApiStateSchema } from './schemas';

// CRU is Create, Read, Update
export function getLinksCRUResponseBody(
  savedObject: SavedObject<StoredLinksState> | SavedObjectsUpdateResponse<StoredLinksState>
) {
  const state = transformOut(savedObject.attributes, savedObject.references);
  const { tags } = toAsCodeTags(savedObject.references); // tags are included in CRU response but embeddable does not use them

  return {
    id: savedObject.id,
    // Route does not apply defaults to response
    // Instead, call validate to ensure defaults are applied to response
    data: linksApiStateSchema.validate(
      Object.fromEntries(
        Object.entries({ ...state, tags }).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // sort keys of response
      )
    ),
    meta: getMeta(savedObject),
  };
}
