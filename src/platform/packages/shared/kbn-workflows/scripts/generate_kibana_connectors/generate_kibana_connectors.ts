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
import yaml from 'yaml';
import {
  KIBANA_CONTRACTS_OUTPUT_FILE_PATH,
  KIBANA_SPEC_OPENAPI_PATH,
  OPENAPI_TS_OUTPUT_FILENAME,
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
} from './constants';
import openapiTsConfig from './openapi_ts.config';
import { isHttpMethod } from '../..';
import type { HttpMethod } from '../../types/latest';
import {
  type ContractMeta,
  generateContractBlock,
  generateOutputSchemaString,
  generateParameterTypes,
  generateParamsSchemaString,
  getRequestSchemaName,
  getResponseSchemaName,
  StaticImports,
  toSnakeCase,
} from '../shared';

export async function generateAndSaveKibanaConnectors() {
  await generateZodSchemas();
  generateAndSaveKibanaConnectorsFile();
}

const generateAndSaveKibanaConnectorsFile = () => {
  try {
    const openApiSpec = yaml.parse(
      fs.readFileSync(KIBANA_SPEC_OPENAPI_PATH, 'utf8')
    ) as OpenAPIV3.Document;

    console.log(`Generating Kibana connectors from ${openApiSpec.paths.length} paths...`);

    const contracts = Object.entries(openApiSpec.paths).flatMap(([path, pathItem]) =>
      generateContractMetasFromPath(path, pathItem as OpenAPIV3.PathItemObject, openApiSpec)
    );

    fs.writeFileSync(
      KIBANA_CONTRACTS_OUTPUT_FILE_PATH,
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
 * This file contains Kibana connector definitions generated from the Kibana OpenAPI specification.
 * Generated at: ${new Date().toISOString()}
 * Source: /oas_docs/output/kibana.yaml (${openApiSpec.paths.length} APIs)
 * 
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import type { InternalConnectorContract } from '../../../types/latest';
import { z } from '@kbn/zod/v4';
import { FetcherConfigSchema } from '../../../spec/schema';
${StaticImports}

// import all needed request and response schemas generated from the OpenAPI spec
import { ${contracts
        .flatMap((contract) => contract.schemaImports)
        .join(',\n')} } from './${OPENAPI_TS_OUTPUT_FILENAME}.gen';

// declare contracts
${contracts.map((contract) => generateContractBlock(contract)).join('\n')}

// export contracts
export const GENERATED_KIBANA_CONNECTORS: InternalConnectorContract[] = [
${contracts.map((contract) => `  ${contract.contractName},`).join('\n')}
];
`,
      'utf8'
    );

    eslintFixAndPrettifyGeneratedCode();

    console.log(`Successfully generated ${contracts.length} Kibana connectors`);
    return { success: true, count: contracts.length };
  } catch (error) {
    console.error('Error generating Kibana connectors:', error);
    return { success: false, count: 0 };
  }
};

async function generateZodSchemas() {
  try {
    console.log('🔄 Generating Zod schemas from OpenAPI spec...');

    // Use @hey-api/openapi-ts to generate TypeScript client, use pinned version because it's still pre 1.0.0 and we want to avoid breaking changes
    await createClient(openapiTsConfig);
    console.log('✅ Zod schemas generated successfully');

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

    return true;
  } catch (error) {
    console.error('❌ Failed to generate API client:', error.message);
    return false;
  }
}

function eslintFixAndPrettifyGeneratedCode() {
  try {
    console.log('🔄 Fixing and prettifying generated code...');
    const command = `npx eslint ${KIBANA_CONTRACTS_OUTPUT_FILE_PATH} --fix --no-ignore`;
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Generated code fixed and prettified successfully');
  } catch (error) {
    console.error('❌ Failed to fix and prettify generated code:', error.message);
    return false;
  }
}

function generateContractName(operationId: string): string {
  return `${toSnakeCase(operationId).toUpperCase()}_CONTRACT`;
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
    const operation = pathItem[method as keyof typeof pathItem] as OpenAPIV3.OperationObject;
    const operationId = operation.operationId;
    if (!operationId) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const type = `kibana.${toSnakeCase(operationId)}`;
    const summary = operation.summary ?? null;
    const description = operation.description ?? null;
    const parameterTypes = generateParameterTypes([operation], openApiDocument);
    const contractName = generateContractName(operationId);
    const schemaImports = [getRequestSchemaName(operationId), getResponseSchemaName(operationId)];
    const paramsSchemaString = generateParamsSchemaString([operationId], {
      // Adding fetcher to all kibana contracts at build time
      fetcher: 'FetcherConfigSchema',
    });
    const outputSchemaString = generateOutputSchemaString([operationId]);

    contractMetas.push({
      connectorGroup: 'internal',
      type,
      summary,
      description,
      methods: [method.toUpperCase() as HttpMethod],
      patterns: [path],
      // Kibana OpenAPI paths has doc links in the description, so we don't extract it as a separate field
      documentation: null,
      parameterTypes,

      contractName,
      operationIds: [operationId],
      paramsSchemaString,
      outputSchemaString,
      schemaImports,
    });
  }
  return contractMetas;
}
