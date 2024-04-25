/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
import { BundledDocument } from '../bundle_document';
import { createBlankOpenApiDocument } from './create_blank_oas_document';
import { mergePaths } from './merge_paths';
import { mergeSharedComponents } from './merge_shared_components';

export async function mergeDocuments(
  bundledDocuments: BundledDocument[]
): Promise<OpenAPIV3.Document> {
  const mergedDocument = createBlankOpenApiDocument();

  mergedDocument.paths = mergePaths(bundledDocuments);
  mergedDocument.components = {
    ...mergedDocument.components,
    ...mergeSharedComponents(bundledDocuments),
  };

  return mergedDocument;
}
