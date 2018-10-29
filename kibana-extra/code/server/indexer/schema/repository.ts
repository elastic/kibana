/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DocumentAnalysisSettings,
  DocumentIndexName,
  DocumentIndexNamePrefix,
  DocumentSchema,
  DocumentTypeName,
} from './document';

export const RepositorySchema = DocumentSchema;
export const RepositoryAnalysisSettings = DocumentAnalysisSettings;
export const RepositoryTypeName = DocumentTypeName;
export const RepositoryIndexNamePrefix = DocumentIndexNamePrefix;
export const RepositoryIndexName = DocumentIndexName;

export const RepositoryReservedField = 'repository';
