/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
import { camelCase, upperFirst } from 'lodash';
import { getApiOperationsList } from './lib/get_api_operations_list';
import { getComponents } from './lib/get_components';
import { getImportsMap, ImportsMap } from './lib/get_imports_map';
import { normalizeSchema } from './lib/normalize_schema';
import { NormalizedOperation, OpenApiDocument } from './openapi_types';
import { getInfo } from './lib/get_info';
import {
  getApiMethodRelativePathFromFilePath,
  getOperationIdFromPath,
  getSchemaTypesRelativePathFromFilePath,
} from './lib/get_paths';
export interface SchemaTypesGenerationContext {
  components: OpenAPIV3.ComponentsObject | undefined;
  operations: NormalizedOperation[];
  info: OpenAPIV3.InfoObject;
  imports: ImportsMap;
}

type OperationId = string;
export type ApiClientGenerationContext = Record<
  OperationId,
  {
    paths: {
      schemaTypesRelativePath: string;
      apiMethodRelativePath: string;
    };
    operation: NormalizedOperation | undefined;
  }
>;

export const getSchemaTypesGenerationContext = (
  document: OpenApiDocument
): SchemaTypesGenerationContext => {
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
};

/*
 *
 * Creates Handlebars context with shape:
 * {
  "createRule": {
    "paths": {
      "schemaTypesRelativePath": "../../../common/api/detection_engine/rule_management/crud/create_rule/create_rule_route.gen",
      "apiMethodRelativePath": "../../../common/api/detection_engine/rule_management/crud/create_rule/create_rule_route.api_method.gen"
    },
    "operation": {
      "path": "/api/detection_engine/rules",
      [...]
      "operationId": "CreateRule",
      "requestBody": {
        "referenceName": "RuleCreateProps"
      },
      "response": {
        "referenceName": "RuleResponse"
      }
    }
  },
  "deleteRule": {
    [...]
  }
 *
 */

export const getApiClientGenerationContext = (
  apiMethodFilePaths: string[],
  operations: NormalizedOperation[],
  rootDir: string
) => {
  // Create tuple that pairs filePath to operationId
  const operationIdsToPathTuples = apiMethodFilePaths.map((filePath) => {
    return [filePath, camelCase(getOperationIdFromPath(filePath))];
  }) as Array<[string, string]>;

  // Create Handlebars context with keys being operationIds
  return operationIdsToPathTuples.reduce<ApiClientGenerationContext>(
    (acc: ApiClientGenerationContext, operationTuple: [string, string]) => {
      const [filePath, operationId] = operationTuple;
      const operation = operations.find((op) => op.operationId === upperFirst(operationId));
      acc[operationId] = {
        paths: {
          schemaTypesRelativePath: getSchemaTypesRelativePathFromFilePath(filePath, rootDir),
          apiMethodRelativePath: getApiMethodRelativePathFromFilePath(filePath, rootDir),
        },
        operation,
      };
      return acc;
    },
    {}
  );
};
