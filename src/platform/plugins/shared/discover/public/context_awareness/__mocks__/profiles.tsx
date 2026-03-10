/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContextWithProfileId } from '../profile_service';
import type { DataSourceContext, RootContext } from '../profiles';
import { DocumentType, type DocumentContext, SolutionType, DataSourceCategory } from '../profiles';

export function getContextWithProfileIdMock<T extends object = {}>(
  params: Partial<ContextWithProfileId<T>> = {}
): ContextWithProfileId<T> {
  return {
    profileId: 'test-profile-id',
    ...params,
  } as ContextWithProfileId<T>;
}

export function getRootContextMock(
  params: Partial<ContextWithProfileId<RootContext>> = {}
): ContextWithProfileId<RootContext> {
  return getContextWithProfileIdMock<RootContext>({
    solutionType: SolutionType.Default,
    ...params,
  });
}

export function getDataSourceContextMock(
  params: Partial<ContextWithProfileId<DataSourceContext>> = {}
): ContextWithProfileId<DataSourceContext> {
  return getContextWithProfileIdMock<DataSourceContext>({
    category: DataSourceCategory.Default,
    ...params,
  });
}

export function getDocumentContextMock(
  params: Partial<ContextWithProfileId<DocumentContext>> = {}
): ContextWithProfileId<DocumentContext> {
  return getContextWithProfileIdMock<DocumentContext>({
    type: DocumentType.Default,
    ...params,
  });
}
