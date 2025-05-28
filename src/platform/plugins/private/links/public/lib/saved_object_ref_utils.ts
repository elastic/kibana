/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { SAVED_OBJECT_REF_NAME, findSavedObjectRef } from '@kbn/presentation-publishing';
import { CONTENT_ID } from '../../common/content_management';

export function createLinksSavedObjectRef(libraryId: string) {
  return {
    name: SAVED_OBJECT_REF_NAME,
    type: CONTENT_ID,
    id: libraryId,
  };
}

export function findLinksSavedObjectRef(references?: Reference[]) {
  return findSavedObjectRef(CONTENT_ID, references);
}
