/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { InternalConnectorContract } from '../../types/latest';

export interface Operation {
  id: string | undefined;
  path: string;
  method: string;
}

export interface ContractMeta
  extends Omit<InternalConnectorContract, 'paramsSchema' | 'outputSchema'> {
  fileName: string;
  contractName: string;
  operations: Operation[];
  paramsSchemaString: string;
  outputSchemaString: string;
  schemaImports: string[];
  additionalImports?: string[];
}

export interface OperationObjectWithOperationId extends OpenAPIV3.OperationObject {
  operationId: string;
}

export interface ParameterTypes {
  headerParams: string[];
  pathParams: string[];
  urlParams: string[];
  bodyParams: string[];
}
