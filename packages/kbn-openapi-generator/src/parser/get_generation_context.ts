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
import { NormalizedOperation, NormalizedSchemaItem, OpenApiDocument } from './openapi_types';
import { getInfo } from './lib/get_info';

interface BaseContext {
  type: 'schema_types' | 'api_client';
}

export interface SchemaTypesGenerationContext extends BaseContext {
  type: 'schema_types';
  components: OpenAPIV3.ComponentsObject | undefined;
  operations: NormalizedOperation[];
  info: OpenAPIV3.InfoObject;
  imports: ImportsMap;
}
export interface ApiClientGenerationContext extends BaseContext {
  type: 'api_client';
  generatedTypesRelativePath: string;
  apiMethodRelativePath: string;
  operationId: string;
  description: string | undefined;
  requestQuery: NormalizedSchemaItem | undefined;
  requestBody: NormalizedSchemaItem | undefined;
}

export function getSchemaTypesGenerationContext(
  document: OpenApiDocument
): SchemaTypesGenerationContext {
  const normalizedDocument = normalizeSchema(document);

  const components = getComponents(normalizedDocument);
  const operations = getApiOperationsList(normalizedDocument);
  const info = getInfo(normalizedDocument);
  const imports = getImportsMap(normalizedDocument);

  return {
    type: 'schema_types',
    components,
    operations,
    info,
    imports,
  };
}
