/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContextWithProfileId } from '../profile_service';
import { DocumentType, type DocumentContext } from '../profiles';

export function getContextWithProfileIdMock<T extends object = {}>(
  params: Partial<ContextWithProfileId<T>> = {}
): ContextWithProfileId<T> {
  return {
    profileId: 'test-profile-id',
    ...params,
  } as ContextWithProfileId<T>;
}

export function getDocumentContextMock(
  params: Partial<ContextWithProfileId<DocumentContext>> = {}
): ContextWithProfileId<DocumentContext> {
  return getContextWithProfileIdMock<DocumentContext>({
    type: DocumentType.Default,
    ...params,
  });
}
