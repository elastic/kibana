/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { StoredLinksEmbeddableState } from '../types';
import { type StoredLinksByValueState910, isLegacyState, transformLegacyState } from './bwc';
import { LINKS_SAVED_OBJECT_TYPE } from '../../constants';
import { injectReferences } from './references';

export function transformOut(
  storedState: StoredLinksEmbeddableState | StoredLinksByValueState910,
  references?: Reference[]
) {
  const state = isLegacyState(storedState)
    ? transformLegacyState(storedState)
    : (storedState as StoredLinksEmbeddableState);

  // inject saved object reference when by-reference
  const savedObjectRef = (references ?? []).find(
    ({ name, type }) => name === 'savedObjectRef' && type === LINKS_SAVED_OBJECT_TYPE
  );
  if (savedObjectRef) {
    return {
      ...state,
      savedObjectId: savedObjectRef.id,
    };
  }

  // inject dashboard references when by-value
  return {
    ...state,
    links: injectReferences(state.links, references),
  };
}
