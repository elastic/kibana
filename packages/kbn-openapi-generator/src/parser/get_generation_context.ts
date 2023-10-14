/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
import { getApiOperationsList } from './lib/get_api_operations_list';
import { getComponents } from './lib/get_components';
import { getImportsMap, ImportsMap } from './lib/get_imports_map';
import { normalizeSchema } from './lib/normalize_schema';
import { NormalizedOperation, OpenApiDocument } from './openapi_types';

export interface GenerationContext {
  components: OpenAPIV3.ComponentsObject | undefined;
  operations: NormalizedOperation[];
  imports: ImportsMap;
  info: OpenAPIV3.InfoObject;
  fileName: string;
}

export function getGenerationContext(
  document: OpenApiDocument,
  sourcePath: string
): GenerationContext {
  const normalizedDocument = normalizeSchema(document);

  const components = getComponents(normalizedDocument);
  const operations = getApiOperationsList(normalizedDocument);
  const imports = getImportsMap(normalizedDocument);
  const info = {
    title: normalizedDocument.info.title,
    /* Convert date versions to YYYY-MM-DD format, integer number versions are untouched */
    version: JSON.stringify(normalizedDocument.info.version).replace(/\"/g, '').split('T')[0],
  };

  const fileName = (/.*\/(.*).schema.yaml/.exec(sourcePath) || [])[1];

  return {
    components,
    operations,
    imports,
    info,
    fileName,
  };
}
