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
import type { OpenAPIV3 } from 'openapi-types';
import Path from 'path';
import yaml from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  KIBANA_CONTRACTS_OUTPUT_FILE_PATH,
  KIBANA_GENERATED_OUTPUT_FOLDER_PATH,
  KIBANA_SPEC_OPENAPI_PATH,
  OPENAPI_TS_OUTPUT_FILENAME,
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
} from './constants';
import { INCLUDED_OPERATIONS, OPERATION_TYPE_OVERRIDES } from './included_operations';
import { isHttpMethod } from '../..';
import type { HttpMethod } from '../../types/latest';
import {
  camelToSnake,
  type ContractMeta,
  eslintFixGeneratedCode,
  formatDuration,
  generateContractBlock,
  generateOutputSchemaString,
  generateParameterTypes,
  generateParamsSchemaString,
  getEslintrcForGeneratedCode,
  getLicenseHeader,
  getRequestSchemaName,
  getResponseSchemaName,
  getSchemaNamePrefix,
  StaticImports,
  toSnakeCase,
} from '../shared';
import type { OperationObjectWithOperationId } from '../shared/types';

export async function run() {
  cleanGeneratedFolder();
  const contracts = generateContracts();
  await generateZodSchemas(contracts);
  saveKibanaConnectors(contracts);
  eslintFixGeneratedCode({
    paths: [
      KIBANA_CONTRACTS_OUTPUT_FILE_PATH,
      `${KIBANA_GENERATED_OUTPUT_FOLDER_PATH}/kibana*.gen.ts`,
    ],
  });
}

function cleanGeneratedFolder() {
  fs.rmSync(KIBANA_GENERATED_OUTPUT_FOLDER_PATH, { recursive: true, force: true });
  fs.mkdirSync(KIBANA_GENERATED_OUTPUT_FOLDER_PATH);
}

function saveKibanaConnectors(contracts: ContractMeta[]) {
  try {
    const startedAt = performance.now();
    console.log('2/3 Generating Kibana connectors...');
    const indexFile = generateKibanaConnectorsIndexFile(contracts);
    fs.writeFileSync(KIBANA_CONTRACTS_OUTPUT_FILE_PATH, indexFile);
    for (const contract of contracts) {
      const connectorFile = generateKibanaConnectorFile(contract);
      fs.writeFileSync(
        Path.resolve(KIBANA_GENERATED_OUTPUT_FOLDER_PATH, contract.fileName),
        connectorFile,
        'utf8'
      );
    }
    fs.writeFileSync(
      Path.resolve(KIBANA_GENERATED_OUTPUT_FOLDER_PATH, '.eslintrc.json'),
      JSON.stringify(getEslintrcForGeneratedCode(), null, 2),
      'utf8'
    );
    console.log(
      `✅ ${contracts.length} Kibana connectors generated in ${formatDuration(
        startedAt,
        performance.now()
      )}`
    );
  } catch (error) {
    console.error('❌ Failed to generate Kibana connectors:', error);
    return false;
  }
}

function generateContracts() {
  const openApiSpec = yaml.parse(
    fs.readFileSync(KIBANA_SPEC_OPENAPI_PATH, 'utf8')
  ) as OpenAPIV3.Document;

  console.log(
    `Generating Kibana connectors from ${Object.keys(openApiSpec.paths).length} paths...`
  );

  return Object.entries(openApiSpec.paths).flatMap(([path, pathItem]) =>
    generateContractMetasFromPath(path, pathItem as OpenAPIV3.PathItemObject, openApiSpec)
  );
}

function generateKibanaConnectorsIndexFile(contracts: ContractMeta[]) {
  return `${getLicenseHeader()}

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 * 
 * This file contains Kibana connector definitions generated from Kibana OpenAPI specification.
 * Generated at: ${new Date().toISOString()}
 * Source: /oas_docs/output/kibana.yaml (${contracts.length} APIs)
 * 
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */
/* eslint-disable import/order */

import type { InternalConnectorContract } from '../../../types/latest';

// import contracts from individual files
${contracts
  .map(
    (contract) =>
      `import { ${contract.contractName} } from './${contract.fileName.replace('.ts', '')}';`
  )
  .join('\n')}

// export contracts
export const GENERATED_KIBANA_CONNECTORS: InternalConnectorContract[] = [
${contracts.map((contract) => `  ${contract.contractName},`).join('\n')}
];`;
}

function generateKibanaConnectorFile(contract: ContractMeta) {
  return `${getLicenseHeader()}
/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 * 
 * Source: /oas_docs/output/kibana.yaml, operations: ${contract.operations
   .map((op) => op.id)
   .join(', ')}
 * 
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import type { InternalConnectorContract } from '../../../types/latest';
import { z } from '@kbn/zod/v4';
${StaticImports}

${
  contract.schemaImports.length > 0
    ? `// import all needed request and response schemas generated from the OpenAPI spec
import { ${contract.schemaImports.join(',\n')} } from './schemas/${OPENAPI_TS_OUTPUT_FILENAME}.gen';
`
    : ''
}
${contract.additionalImports?.join('\n')}

// export contract
${generateContractBlock(contract)}
`;
}

async function generateZodSchemas(contracts: ContractMeta[]) {
  try {
    const startedAt = performance.now();
    console.log('1/3 Generating Zod schemas from OpenAPI spec...');

    console.log('- Importing openapi-ts config...');
    const buildOpenapiTsConfig = await import('./openapi_ts.config').then(
      (module) => module.default
    );
    console.log(`- Openapi-ts config imported in ${formatDuration(startedAt, performance.now())}`);
    const createClientStartedAt = performance.now();
    console.log('- Creating Zod schemas with openapi-ts...');

    // Use openapi-zod-client CLI to generate TypeScript client, use pinned version because it's still pre 1.0.0 and we want to avoid breaking changes
    await createClient(
      buildOpenapiTsConfig({
        include: contracts.flatMap((contract) =>
          contract.operations.map((op) => `${op.method} ${op.path}`)
        ),
      })
    );
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
    console.error('❌ Failed to generate API client:', error);
    return false;
  }
}

function generateContractName(operationId: string): string {
  return `${getSchemaNamePrefix(operationId).toUpperCase()}_CONTRACT`;
}

function generateContractMetasFromPath(
  path: string,
  pathItem: OpenAPIV3.PathItemObject,
  openApiDocument: OpenAPIV3.Document
): ContractMeta[] {
  const contractMetas: ContractMeta[] = [];
  for (const key of Object.keys(pathItem)) {
    if (!isHttpMethod(key.toUpperCase())) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const method = key.toLowerCase();
    const operation = pathItem[method as keyof typeof pathItem] as OperationObjectWithOperationId;
    const operationId = operation.operationId;

    if (!operationId || !INCLUDED_OPERATIONS.includes(operationId)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    // Use type override if available, otherwise use the default operationId
    const typeBaseName = OPERATION_TYPE_OVERRIDES[operationId] ?? operationId;
    const type = `kibana.${typeBaseName}`;
    const summary = operation.summary ?? null;
    const description = operation.description ?? null;
    const parameterTypes = generateParameterTypes([operation], openApiDocument);
    const contractName = generateContractName(operationId);
    const schemaImports = [getRequestSchemaName(operationId), getResponseSchemaName(operationId)];
    const paramsSchemaString = generateParamsSchemaString([operationId], {
      // Adding fetcher to all kibana contracts at build time
      fetcher: 'FetcherConfigSchema',
    });
    const outputSchemaString = generateOutputSchemaString([operation], openApiDocument);

    contractMetas.push({
      type,
      summary,
      description,
      methods: [method.toUpperCase() as HttpMethod],
      patterns: [path],
      documentation: getDocumentationUrl(operation),
      parameterTypes,

      fileName: `kibana.${toSnakeCase(camelToSnake(operationId))}.gen.ts`,
      contractName,
      operations: [
        {
          id: operationId,
          method: method.toUpperCase(),
          path,
        },
      ],
      paramsSchemaString,
      outputSchemaString,
      schemaImports,
      additionalImports: ["import { FetcherConfigSchema } from '../../schema';"],
    });
  }
  return contractMetas;
}

function getDocumentationUrl(
  operation: OpenAPIV3.OperationObject & { operationId: string }
): string {
  if (operation.externalDocs && operation.externalDocs.url) {
    return operation.externalDocs.url;
  }
  return `https://www.elastic.co/docs/api/doc/kibana/operation/operation-${operation.operationId
    .toLowerCase()
    .replace(/\s/g, '')}`;
}
