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
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
} from './constants';
import type { SpecificationTypes } from './types';
import type { HttpMethod, InternalConnectorContract } from '../../types/latest';

interface ContractMeta extends Omit<InternalConnectorContract, 'paramsSchema' | 'outputSchema'> {
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
 * To regenerate: node scripts/generate_workflows_contracts.js
 */

import type { InternalConnectorContract } from '../../types/latest';
import { z } from '@kbn/zod/v4';
import { getShape } from '../utils';

// import all needed request and response schemas generated from the OpenAPI spec
import { ${contracts
        .flatMap((contract) => contract.schemaImports)
        .join(',\n')} } from './schemas/zod.gen';

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
    const command = `npx @hey-api/openapi-ts@0.87.5 -f ${OPENAPI_TS_CONFIG_PATH}`;
    console.log(`Running: ${command}`);

    execSync(command, { stdio: 'inherit' });
    console.log('✅ Zod schemas generated successfully');

    const zodPath = Path.resolve(OPENAPI_TS_OUTPUT_FOLDER_PATH, 'zod.gen.ts');

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

function generateContractBlock(contract: ContractMeta): string {
  return `
const ${contract.contractName}: InternalConnectorContract = {
  type: '${contract.type}',
  description: \`${escapeString(contract.description ?? '')}\`,
  methods: ${JSON.stringify(contract?.methods ?? [])},
  patterns: ${JSON.stringify(contract?.patterns ?? [])},
  isInternal: true,
  documentation: '${contract.documentation}',
  parameterTypes: {
    pathParams: ${JSON.stringify(contract?.parameterTypes?.pathParams ?? [])},
    urlParams: ${JSON.stringify(contract?.parameterTypes?.urlParams ?? [])},
    bodyParams: ${JSON.stringify(contract?.parameterTypes?.bodyParams ?? [])},
  },
  paramsSchema: ${generateParamsSchemaString(contract.operationIds)},
  outputSchema: ${generateOutputSchemaString(contract.operationIds)},
}`.trim();
}

function generateContractName(endpoint: SpecificationTypes.Endpoint): string {
  return `${toSnakeCase(endpoint.name).toUpperCase()}_CONTRACT`;
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/`/g, '\\`') // Escape backticks
    .replace(/\$/g, '\\$'); // Escape dollar signs (template literals)
}

function generateContractMeta(
  endpoint: SpecificationTypes.Endpoint,
  openApiDocument: OpenAPIV3.Document
): ContractMeta {
  const type = `elasticsearch.${endpoint.name}`;
  const description = endpoint.description;
  const documentation = endpoint.docUrl;
  const { methods, patterns } = generateMethodsAndPatterns(endpoint);
  const parameterTypes = generateParameterTypes(endpoint, openApiDocument);

  const contractName = generateContractName(endpoint);
  const operationIds = getRelatedOperationIds(endpoint, openApiDocument);
  const schemaImports = operationIds.flatMap((operationId) => [
    getRequestSchemaName(operationId),
    getResponseSchemaName(operationId),
  ]);

  return {
    type,
    description,
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

function getRelatedOperationIds(
  endpoint: SpecificationTypes.Endpoint,
  openApiDocument: OpenAPIV3.Document
): string[] {
  const operationIds: string[] = [];
  for (const url of endpoint.urls) {
    const openapiPath = openApiDocument.paths[url.path];
    if (openapiPath) {
      for (const method of url.methods) {
        const operation = openapiPath[
          method.toLowerCase() as keyof typeof openapiPath
        ] as OpenAPIV3.OperationObject;
        if (operation && operation.operationId) {
          operationIds.push(operation.operationId);
        }
      }
    }
  }
  return operationIds;
}

function generateParameterTypes(
  endpoint: SpecificationTypes.Endpoint,
  openApiDocument: OpenAPIV3.Document
): {
  pathParams: string[];
  urlParams: string[];
  bodyParams: string[];
} {
  console.log('Generating parameter types for endpoint:', endpoint.name);
  const endpointPaths = endpoint.urls.map((url) => url.path);
  console.log('Endpoint paths:', endpointPaths);
  const oasPaths = endpointPaths
    .map((path) => openApiDocument.paths[path])
    .filter((path): path is { [key: string]: OpenAPIV3.PathItemObject } => path !== undefined);
  console.log('OAS paths:', oasPaths);
  const allParameters = oasPaths
    .flatMap((path) => Object.values(path).flatMap((p) => p.parameters))
    .filter((param): param is OpenAPIV3.ParameterObject => param !== undefined && 'name' in param);
  console.log('All parameters:', allParameters);
  const pathParams = allParameters
    .filter((param) => param.in === 'path')
    .map((param) => param.name);
  const urlParams = allParameters
    .filter((param) => param.in === 'query')
    .map((param) => param.name);
  const bodyParams = allParameters
    .filter((param) => param.in === 'body')
    .map((param) => param.name);
  console.log('Path params:', pathParams);
  console.log('URL params:', urlParams);
  console.log('Body params:', bodyParams);
  return {
    pathParams,
    urlParams,
    bodyParams,
  };
}

function generateMethodsAndPatterns(endpoint: SpecificationTypes.Endpoint): {
  methods: HttpMethod[];
  patterns: string[];
} {
  const methods = endpoint.urls.flatMap((url) => url.methods as HttpMethod[]);
  const patterns = endpoint.urls.map((url) => url.path);
  return { methods, patterns };
}

// TODO: unwrap and combine the shapes at the build time instead of at the runtime
function generateParamsSchemaString(operationIds: string[]): string {
  if (operationIds.length === 0) {
    return 'z.optional(z.looseObject({}))';
  }
  if (operationIds.length === 1) {
    return `z.looseObject({
      ...(getShape(getShape(${getRequestSchemaName(operationIds[0])}).body)), 
      ...(getShape(getShape(${getRequestSchemaName(operationIds[0])}).path)), 
      ...(getShape(getShape(${getRequestSchemaName(operationIds[0])}).query)),
    }).partial()`;
  }
  return `z.looseObject({${operationIds
    .map(
      (operationId) => `...(getShape(getShape(${getRequestSchemaName(operationId)}).body)), 
    ...(getShape(getShape(${getRequestSchemaName(operationId)}).path)), 
    ...(getShape(getShape(${getRequestSchemaName(operationId)}).query)),`
    )
    .join('\n')}}).partial()`;
}

function generateOutputSchemaString(operationIds: string[]): string {
  return `z.object({
    output: z.looseObject({
      ${operationIds
        .map((operationId) => `...(getShape(getShape(${getResponseSchemaName(operationId)})))`)
        .join(', ')}
    }),
    error: z.any().optional(),
  })`;
}

function getRequestSchemaName(operationId: string): string {
  return `${getSchemaNamePrefix(operationId)}_request`;
}

function getResponseSchemaName(operationId: string): string {
  return `${getSchemaNamePrefix(operationId)}_response`;
}

// copied from packages/openapi-ts/src/openApi/common/parser/sanitize.ts, which is licensed under the MIT license
/**
 * Sanitizes namespace identifiers so they are valid TypeScript identifiers of a certain form.
 *
 * 1: Remove any leading characters that are illegal as starting character of a typescript identifier.
 * 2: Replace illegal characters in remaining part of type name with hyphen (-).
 *
 * Step 1 should perhaps instead also replace illegal characters with underscore, or prefix with it, like sanitizeEnumName
 * does. The way this is now one could perhaps end up removing all characters, if all are illegal start characters. It
 * would be sort of a breaking change to do so, though, previously generated code might change then.
 *
 * JavaScript identifier regexp pattern retrieved from https://developer.mozilla.org/docs/Web/JavaScript/Reference/Lexical_grammar#identifiers
 *
 * The output of this is expected to be converted to PascalCase
 */
export const sanitizeNamespaceIdentifier = (name: string) =>
  name
    .replace(/^[^\p{ID_Start}]+/u, '')
    .replace(/[^$\u200c\u200d\p{ID_Continue}]/gu, '-')
    .replace(/[$+]/g, '-');

function toSnakeCase(str: string): string {
  return str
    .replace(/-(\d+)/g, '$1') // Remove hyphen before numbers
    .replace(/-/g, '_') // Replace remaining hyphens with underscores
    .replace(/\./g, '_'); // Replace dots with underscores
}

export function getSchemaNamePrefix(operationId: string): string {
  return toSnakeCase(sanitizeNamespaceIdentifier(operationId));
}
