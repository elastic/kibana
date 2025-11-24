/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { execSync } from 'node:child_process';
import type { OpenAPIV3 } from 'openapi-types';
import Path from 'path';
import {
  ES_CONTRACTS_OUTPUT_FILE_PATH,
  ES_SPEC_OPENAPI_PATH,
  ES_SPEC_SCHEMA_PATH,
  OPENAPI_TS_CONFIG_PATH,
  OPENAPI_TS_OUTPUT_FILENAME,
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
} from './constants';
import type { SpecificationTypes } from './types';
import type { HttpMethod, InternalConnectorContract } from '../../types/latest';
import {
  generateContractBlock,
  generateParameterTypes,
  getRequestSchemaName,
  getResponseSchemaName,
  toSnakeCase,
} from '../generation_utils';

export interface ContractMeta
  extends Omit<InternalConnectorContract, 'paramsSchema' | 'outputSchema'> {
  contractName: string;
  operationIds: string[];
  schemaImports: string[];
}

export const generateAndSaveEsConnectors = () => {
  try {
    const schema = JSON.parse(
      fs.readFileSync(ES_SPEC_SCHEMA_PATH, 'utf8')
    ) as SpecificationTypes.Model;
    const openApiSpec = JSON.parse(
      fs.readFileSync(ES_SPEC_OPENAPI_PATH, 'utf8')
    ) as OpenAPIV3.Document;

    const endpoints = schema.endpoints.filter(
      (endpoint) => !endpoint.name.startsWith('_internal.')
    );

    generateZodSchemas();

    console.log(`Generating Elasticsearch connectors from ${endpoints.length} endpoints...`);

    const contracts = endpoints.map((endpoint) => generateContractMeta(endpoint, openApiSpec));

    fs.writeFileSync(
      ES_CONTRACTS_OUTPUT_FILE_PATH,
      `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 * 
 * This file contains Elasticsearch connector definitions generated from elasticsearch-specification repository.
 * Generated at: ${new Date().toISOString()}
 * Source: elasticsearch-specification repository (${schema.endpoints.length} APIs)
 * 
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import type { InternalConnectorContract } from '../../types/latest';
import { z } from '@kbn/zod/v4';
import { getLooseObjectFromProperty, getShape } from '../utils';

// import all needed request and response schemas generated from the OpenAPI spec
import { ${contracts
        .flatMap((contract) => contract.schemaImports)
        .join(',\n')} } from './schemas/${OPENAPI_TS_OUTPUT_FILENAME}.gen';

// declare contracts
${contracts.map((contract) => generateContractBlock(contract)).join('\n')}

// export contracts
export const GENERATED_ELASTICSEARCH_CONNECTORS: InternalConnectorContract[] = [
${contracts.map((contract) => `  ${contract.contractName},`).join('\n')}
];
`,
      'utf8'
    );

    eslintFixAndPrettifyGeneratedCode();

    console.log(`Successfully generated ${contracts.length} Elasticsearch connectors`);
    return { success: true, count: contracts.length };
  } catch (error) {
    console.error('Error generating Elasticsearch connectors:', error);
    return { success: false, count: 0 };
  }
};

function generateZodSchemas() {
  try {
    console.log('🔄 Generating Zod schemas from OpenAPI spec...');

    // Use openapi-zod-client CLI to generate TypeScript client, use pinned version because it's still pre 1.0.0 and we want to avoid breaking changes
    const command = `npx @hey-api/openapi-ts@0.88.0 -f ${OPENAPI_TS_CONFIG_PATH}`;
    console.log(`Running: ${command}`);

    execSync(command, { stdio: 'inherit' });
    console.log('✅ Zod schemas generated successfully');

    const zodPath = Path.resolve(
      OPENAPI_TS_OUTPUT_FOLDER_PATH,
      `${OPENAPI_TS_OUTPUT_FILENAME}.gen.ts`
    );

    // replace zod imports with @kbn/zod
    const zodSchemas = fs.readFileSync(zodPath, 'utf8');
    fs.writeFileSync(
      zodPath,
      zodSchemas.replace(/import { z } from 'zod';/, "import { z } from '@kbn/zod/v4';"),
      'utf8'
    );

    return true;
  } catch (error) {
    console.error('❌ Failed to generate API client:', error.message);
    return false;
  }
}

function eslintFixAndPrettifyGeneratedCode() {
  try {
    console.log('🔄 Fixing and prettifying generated code...');
    const command = `npx eslint ${ES_CONTRACTS_OUTPUT_FILE_PATH} --fix --no-ignore`;
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Generated code fixed and prettified successfully');
  } catch (error) {
    console.error('❌ Failed to fix and prettify generated code:', error.message);
    return false;
  }
}

function generateContractName(endpoint: SpecificationTypes.Endpoint): string {
  return `${toSnakeCase(endpoint.name).toUpperCase()}_CONTRACT`;
}

function generateContractMeta(
  endpoint: SpecificationTypes.Endpoint,
  openApiDocument: OpenAPIV3.Document
): ContractMeta {
  const operations = getRelatedOperations(endpoint, openApiDocument);
  const type = `elasticsearch.${endpoint.name}`;
  const description = `${endpoint.description}\n\n Documentation: ${endpoint.docUrl}`;
  const summary = generateSummary(operations);
  const documentation = endpoint.docUrl;
  const { methods, patterns } = generateMethodsAndPatterns(endpoint);
  const parameterTypes = generateParameterTypes(operations, openApiDocument);

  const contractName = generateContractName(endpoint);
  const operationIds = operations
    .map((operation) => operation.operationId ?? '')
    .filter((operationId) => operationId !== '');
  const schemaImports = operationIds.flatMap((operationId) => [
    getRequestSchemaName(operationId),
    getResponseSchemaName(operationId),
  ]);

  return {
    type,
    description,
    summary,
    methods,
    patterns,
    documentation,
    isInternal: true,
    parameterTypes,

    contractName,
    operationIds,
    schemaImports,
  };
}

function getRelatedOperations(
  endpoint: SpecificationTypes.Endpoint,
  openApiDocument: OpenAPIV3.Document
): OpenAPIV3.OperationObject[] {
  const operations: OpenAPIV3.OperationObject[] = [];
  for (const url of endpoint.urls) {
    const openapiPath = openApiDocument.paths[url.path];
    if (openapiPath) {
      for (const method of url.methods) {
        const operation = openapiPath[
          method.toLowerCase() as keyof typeof openapiPath
        ] as OpenAPIV3.OperationObject;
        if (operation && operation.operationId) {
          operations.push(operation);
        }
      }
    }
  }
  return operations;
}

function generateSummary(operations: OpenAPIV3.OperationObject[]): string {
  return operations.find((operation) => operation.summary)?.summary ?? '';
}

function generateMethodsAndPatterns(endpoint: SpecificationTypes.Endpoint): {
  methods: HttpMethod[];
  patterns: string[];
} {
  const methods = new Set(endpoint.urls.flatMap((url) => url.methods as HttpMethod[]));
  // removing leading slash if present
  const patterns = endpoint.urls.map((url) => url.path.replace(/^\//, ''));
  return { methods: Array.from(methods), patterns };
}
