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

export const generateAndSaveEsConnectors = () => {
  try {
    const schema = JSON.parse(
      fs.readFileSync(ES_SPEC_SCHEMA_PATH, 'utf8')
    ) as SpecificationTypes.Model;
    const openApiSpec = JSON.parse(
      fs.readFileSync(ES_SPEC_OPENAPI_PATH, 'utf8')
    ) as OpenAPIV3.Document;

    const endpoints = schema.endpoints.filter((endpoint) => endpoint.name === 'search').slice(0, 1);

    generateZodSchemas();

    console.log(`Generating ${schema.endpoints.length} Elasticsearch connectors`);

    const contractsWritten = new Set<string>();
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
import { ${endpoints
        .map((endpoint) => [getRequestSchemaName(endpoint), getResponseSchemaName(endpoint)])
        .flat()
        .join(',\n')} } from './schemas/zod.gen';

`,
      'utf8'
    );
    for (const endpoint of endpoints) {
      console.log(`Generating contract for ${endpoint.name}...`);
      fs.appendFileSync(
        ES_CONTRACTS_OUTPUT_FILE_PATH,
        // eslint-disable-next-line prefer-template
        generateContractBlock(endpoint, openApiSpec) + '\n',
        'utf8'
      );
      contractsWritten.add(generateContractName(endpoint));
    }

    fs.appendFileSync(
      ES_CONTRACTS_OUTPUT_FILE_PATH,
      `export const GENERATED_ELASTICSEARCH_CONNECTORS: InternalConnectorContract[] = [
${Array.from(contractsWritten)
  .map((contract) => `  ${contract},`)
  .join('\n')}
];
`.trim(),
      'utf8'
    );
    eslintFixAndPrettifyGeneratedCode();

    console.log(`Successfully generated ${contractsWritten.size} Elasticsearch connectors`);
    return { success: true, count: contractsWritten.size };
  } catch (error) {
    console.error('Error generating Elasticsearch connectors:', error);
    return { success: false, count: 0 };
  }
};

/**
 * Generate API client using openapi-zod-client CLI
 */
function generateZodSchemas() {
  try {
    console.log('🔄 Generating Zod schemas from OpenAPI spec...');

    // Use openapi-zod-client CLI to generate TypeScript client
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

function generateContractBlock(
  endpoint: SpecificationTypes.Endpoint,
  openApiSpec: OpenAPIV3.Document
): string {
  const contract = generateContract(endpoint, openApiSpec);

  return `
const ${generateContractName(endpoint)}: InternalConnectorContract = {
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
  paramsSchema: ${generateParamsSchemaString(endpoint)},
  outputSchema: ${generateOutputSchemaString(endpoint)},
}`.trim();
}

function generateContractName(endpoint: SpecificationTypes.Endpoint): string {
  return `${getSchemaNamePrefix(endpoint).toUpperCase()}_CONTRACT`;
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/`/g, '\\`') // Escape backticks
    .replace(/\$/g, '\\$'); // Escape dollar signs (template literals)
}

function generateContract(
  endpoint: SpecificationTypes.Endpoint,
  openApiDocument: OpenAPIV3.Document
): InternalConnectorContract {
  const type = `elasticsearch.${endpoint.name}`;
  const description = endpoint.description;
  const documentation = endpoint.docUrl;
  const { methods, patterns } = generateMethodsAndPatterns(endpoint);
  const parameterTypes = generateParameterTypes(endpoint, openApiDocument);

  return {
    type,
    description,
    methods,
    patterns,
    documentation,
    isInternal: true,
    parameterTypes,
    // paramsSchema: generateParamsSchema(endpoint),
    // outputSchema: generateOutputSchema(endpoint),
  };
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

function generateParamsSchemaString(endpoint: SpecificationTypes.Endpoint): string {
  return `z.object({
    ...(${getRequestSchemaName(endpoint)}.shape.body?.unwrap()?.shape ?? {}), 
    ...(${getRequestSchemaName(endpoint)}.shape.path?.unwrap()?.shape ?? {}), 
    ...(${getRequestSchemaName(endpoint)}.shape.query?.unwrap()?.shape ?? {}),
})`;
}

function generateOutputSchemaString(endpoint: SpecificationTypes.Endpoint): string {
  return `z.object({
    output: ${getResponseSchemaName(endpoint)},
    error: z.any().optional(),
  })`;
}

function getRequestSchemaName(endpoint: SpecificationTypes.Endpoint): string {
  return `${getSchemaNamePrefix(endpoint)}_request`;
}

function getResponseSchemaName(endpoint: SpecificationTypes.Endpoint): string {
  return `${getSchemaNamePrefix(endpoint)}_response`;
}

function getSchemaNamePrefix(endpoint: SpecificationTypes.Endpoint): string {
  return `${endpoint.name.replace('.', '_')}`;
}
