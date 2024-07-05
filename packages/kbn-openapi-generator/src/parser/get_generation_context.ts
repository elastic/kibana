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
import { getInfo } from './lib/get_info';
import { getCircularRefs } from './lib/get_circular_refs';

export interface GenerationContext {
  components: OpenAPIV3.ComponentsObject | undefined;
  operations: NormalizedOperation[];
  info: OpenAPIV3.InfoObject;
  imports: ImportsMap;
  circularRefs: Set<string>;
}

export function getGenerationContext(document: OpenApiDocument): GenerationContext {
  const normalizedDocument = normalizeSchema(document);

  const components = getComponents(normalizedDocument);
  const operations = getApiOperationsList(normalizedDocument);
  const info = getInfo(normalizedDocument);
  const imports = getImportsMap(normalizedDocument);
  const circularRefs = getCircularRefs(normalizedDocument);

  return {
    components,
    operations,
    info,
    imports,
    circularRefs,
  };
}
