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
import yaml from 'yaml';
import {
  KIBANA_CONTRACTS_OUTPUT_FILE_PATH,
  KIBANA_SPEC_OPENAPI_PATH,
  OPENAPI_TS_CONFIG_PATH,
  OPENAPI_TS_OUTPUT_FILENAME,
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
} from './constants';
import { isHttpMethod } from '../..';
import type { HttpMethod } from '../../types/latest';
import {
  type ContractMeta,
  escapeString,
  generateOutputSchemaString,
  generateParameterTypes,
  generateParamsSchemaString,
  getRequestSchemaName,
  getResponseSchemaName,
  toSnakeCase,
} from '../generation_utils';

export const generateAndSaveKibanaConnectors = () => {
  try {
    const openApiSpec = yaml.parse(
      fs.readFileSync(KIBANA_SPEC_OPENAPI_PATH, 'utf8')
    ) as OpenAPIV3.Document;

    generateZodSchemas();

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
    const command = `npx eslint ${KIBANA_CONTRACTS_OUTPUT_FILE_PATH} --fix --no-ignore`;
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
  summary: \`${escapeString(contract.summary ?? '')}\`,
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
    const description = operation.description;
    const documentation = getDocumentationUrl(path, pathItem);
    const parameterTypes = generateParameterTypes([operation], openApiDocument);
    const contractName = generateContractName(operationId);
    const schemaImports = [getRequestSchemaName(operationId), getResponseSchemaName(operationId)];

    contractMetas.push({
      type,
      description,
      summary: operation.summary,
      methods: [method.toUpperCase() as HttpMethod],
      patterns: [path],
      documentation,
      parameterTypes,

      contractName,
      operationIds: [operationId],
      schemaImports,
    });
  }
  return contractMetas;
}

function getDocumentationUrl(path: string, pathItem: OpenAPIV3.PathItemObject): string {
  return 'URL_NOT_IMPLEMENTED';
}
