/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createClient } from '@hey-api/openapi-ts';
import fs from 'fs';
import { execSync } from 'node:child_process';
import type { OpenAPIV3 } from 'openapi-types';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  ES_CONTRACTS_OUTPUT_FILE_PATH,
  ES_GENERATED_OUTPUT_FOLDER_PATH,
  ES_SPEC_OPENAPI_PATH,
  ES_SPEC_SCHEMA_PATH,
  OPENAPI_TS_OUTPUT_FILENAME,
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
} from './constants';
import type { SpecificationTypes } from './types';
import type { HttpMethod } from '../../types/latest';
import {
  type ContractMeta,
  formatDuration,
  generateContractBlock,
  generateOutputSchemaString,
  generateParameterTypes,
  generateParamsSchemaString,
  getRequestSchemaName,
  getResponseSchemaName,
  StaticImports,
  toSnakeCase,
} from '../shared';

export async function run() {
  await generateZodSchemas();
  generateAndSaveEsConnectors();
  eslintFixAndPrettifyGeneratedCode();
}

function generateAndSaveEsConnectors() {
  try {
    const startedAt = performance.now();
    console.log('2/3 Generating Elasticsearch connectors...');
    const contracts = generateContracts();
    const indexFile = generateEsConnectorsIndexFile(contracts);
    fs.writeFileSync(ES_CONTRACTS_OUTPUT_FILE_PATH, indexFile);
    for (const contract of contracts) {
      const connectorFile = generateEsConnectorFile(contract);
      fs.writeFileSync(
        Path.resolve(ES_GENERATED_OUTPUT_FOLDER_PATH, contract.fileName),
        connectorFile,
        'utf8'
      );
    }
    console.log(
      `✅ ${contracts.length} Elasticsearch connectors generated in ${formatDuration(
        startedAt,
        performance.now()
      )}`
    );
  } catch (error) {
    console.error('❌ Failed to generate Elasticsearch connectors:', error.message);
    return false;
  }
}

function generateContracts() {
  const schema = JSON.parse(
    fs.readFileSync(ES_SPEC_SCHEMA_PATH, 'utf8')
  ) as SpecificationTypes.Model;
  const openApiSpec = JSON.parse(
    fs.readFileSync(ES_SPEC_OPENAPI_PATH, 'utf8')
  ) as OpenAPIV3.Document;

  const endpoints = schema.endpoints.filter((endpoint) => !endpoint.name.startsWith('_internal.'));

  console.log(`Generating Elasticsearch connectors from ${endpoints.length} endpoints...`);

  return endpoints.map((endpoint) => generateContractMeta(endpoint, openApiSpec));
}

function generateEsConnectorsIndexFile(contracts: ContractMeta[]) {
  return `${getLicenseHeader()}

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 * 
 * This file contains Elasticsearch connector definitions generated from elasticsearch-specification repository.
 * Generated at: ${new Date().toISOString()}
 * Source: elasticsearch-specification repository (${contracts.length} APIs)
 * 
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import type { InternalConnectorContract } from '../../../types/latest';

// import contracts from individual files
${contracts
  .map(
    (contract) =>
      `import { ${contract.contractName} } from './${contract.fileName.replace('.ts', '')}';`
  )
  .join('\n')}

// export contracts
export const GENERATED_ELASTICSEARCH_CONNECTORS: InternalConnectorContract[] = [
${contracts.map((contract) => `  ${contract.contractName},`).join('\n')}
];`;
}

function generateEsConnectorFile(contract: ContractMeta) {
  return `${getLicenseHeader()}
/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 * 
 * Generated at: ${new Date().toISOString()}
 * Source: elasticsearch-specification repository, operations: ${contract.operationIds.join(', ')}
 * 
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import type { InternalConnectorContract } from '../../../types/latest';
import { z } from '@kbn/zod/v4';
${StaticImports}

// import all needed request and response schemas generated from the OpenAPI spec
import { ${contract.schemaImports.join(',\n')} } from './${OPENAPI_TS_OUTPUT_FILENAME}.gen';

// export contract
${generateContractBlock(contract)}
`;
}

function getLicenseHeader() {
  return `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
`;
}

async function generateZodSchemas() {
  try {
    const startedAt = performance.now();
    console.log('1/3 Generating Zod schemas from OpenAPI spec...');

    console.log('- Importing openapi-ts config...');
    const openapiTsConfig = await import('./openapi_ts.config').then((module) => module.default);
    console.log(`- Openapi-ts config imported in ${formatDuration(startedAt, performance.now())}`);

    const createClientStartedAt = performance.now();
    console.log('- Creating Zod schemas with openapi-ts...');
    // Use openapi-zod-client CLI to generate TypeScript client, use pinned version because it's still pre 1.0.0 and we want to avoid breaking changes
    await createClient(openapiTsConfig);
    console.log(
      `- Zod schemas generated in ${formatDuration(createClientStartedAt, performance.now())}`
    );

    const replaceZodImportsStartedAt = performance.now();
    console.log('- Replacing zod imports with @kbn/zod...');
    const zodPath = Path.resolve(
      OPENAPI_TS_OUTPUT_FOLDER_PATH,
      `${OPENAPI_TS_OUTPUT_FILENAME}.gen.ts`
    );

    // replace zod imports with @kbn/zod
    const zodSchemas = fs.readFileSync(zodPath, 'utf8');
    fs.writeFileSync(
      zodPath,
      zodSchemas.replace(/import { z } from 'zod\/v4';/, "import { z } from '@kbn/zod/v4';"),
      'utf8'
    );
    console.log(
      `- Zod imports replaced in ${formatDuration(replaceZodImportsStartedAt, performance.now())}`
    );

    console.log(
      `✅ Zod schemas saved to ${Path.relative(REPO_ROOT, zodPath)} in ${formatDuration(
        startedAt,
        performance.now()
      )}`
    );
    return true;
  } catch (error) {
    console.error('❌ Failed to generate API client:', error.message);
    return false;
  }
}

function eslintFixAndPrettifyGeneratedCode() {
  try {
    const startedAt = performance.now();
    console.log(
      '3/3 Running eslint --fix on generated code... Hang tight, it might take a min or two...'
    );
    const command = `npx eslint ${ES_GENERATED_OUTPUT_FOLDER_PATH}/index.ts ${ES_GENERATED_OUTPUT_FOLDER_PATH}/elasticsearch*.gen.ts --fix --no-ignore`;
    execSync(command, { stdio: 'inherit' });
    console.log(
      `✅ Generated code fixed and prettified in ${formatDuration(startedAt, performance.now())}`
    );
  } catch (error) {
    console.error('❌ Failed to fix and prettify generated code:', error.message);
    return false;
  }
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
  const paramsSchemaString = generateParamsSchemaString(operationIds, {});
  const outputSchemaString = generateOutputSchemaString(operationIds);

  return {
    connectorGroup: 'internal',
    type,
    description,
    summary,
    methods,
    patterns,
    documentation,
    parameterTypes,

    fileName: `${type}.gen.ts`,
    contractName,
    operationIds,
    schemaImports,
    paramsSchemaString,
    outputSchemaString,
  };
}

function generateContractName(endpoint: SpecificationTypes.Endpoint): string {
  return `${toSnakeCase(endpoint.name).toUpperCase()}_CONTRACT`;
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
