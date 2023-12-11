/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import Path, { join } from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import type {
  DefinitionUrlParams,
  EndpointDefinition,
  EndpointDescription,
} from '@kbn/console-plugin/common/types';
import { generateQueryParams } from './generate_query_params';
import { generateAvailability } from './generate_availability';
import type { SpecificationTypes } from './types';
import { findTypeDefinition } from './helpers';
import { generateUrlComponents } from './generate_url_components';

const generateMethods = (endpoint: SpecificationTypes.Endpoint): string[] => {
  // this array consists of arrays of strings
  const methodsArray = endpoint.urls.map((url) => url.methods);
  // flatten to return array of strings
  const flattenMethodsArray = ([] as string[]).concat(...methodsArray);
  // use set to remove duplication
  return [...new Set(flattenMethodsArray)];
};

const generatePatterns = (endpoint: SpecificationTypes.Endpoint): string[] => {
  return endpoint.urls.map(({ path }) => {
    let pattern = path;
    // remove leading / if present
    if (path.startsWith('/')) {
      pattern = path.substring(1);
    }
    return pattern;
  });
};

const generateDocumentation = (endpoint: SpecificationTypes.Endpoint): string => {
  return endpoint.docUrl;
};
interface GeneratedParameters {
  urlParams: DefinitionUrlParams;
  urlComponents: DefinitionUrlParams;
}
const generateParameters = (
  endpoint: SpecificationTypes.Endpoint,
  schema: SpecificationTypes.Model
): GeneratedParameters | undefined => {
  const { request } = endpoint;
  if (!request) {
    return;
  }
  const requestType = findTypeDefinition(schema, request);
  if (!requestType) {
    return;
  }

  const urlParams = generateQueryParams(requestType as SpecificationTypes.Request, schema);
  const urlComponents = generateUrlComponents(requestType as SpecificationTypes.Request, schema);
  return { urlParams, urlComponents };
};

const addParams = (
  definition: EndpointDescription,
  params: GeneratedParameters
): EndpointDescription => {
  const { urlParams, urlComponents } = params;
  if (Object.keys(urlParams).length > 0) {
    definition.url_params = urlParams;
  }
  if (Object.keys(urlComponents).length > 0) {
    definition.url_components = urlComponents;
  }
  return definition;
};

const generateDefinition = (
  endpoint: SpecificationTypes.Endpoint,
  schema: SpecificationTypes.Model
): EndpointDescription => {
  const methods = generateMethods(endpoint);
  const patterns = generatePatterns(endpoint);
  const documentation = generateDocumentation(endpoint);
  const availability = generateAvailability(endpoint);
  let definition: EndpointDescription = {};
  const params = generateParameters(endpoint, schema);
  if (params) {
    definition = addParams(definition, params);
  }
  definition = { ...definition, methods, patterns, documentation, availability };

  return definition;
};

export function generateConsoleDefinitions({
  specsRepo,
  definitionsFolder,
  log,
}: {
  specsRepo: string;
  definitionsFolder: string;
  log: ToolingLog;
}) {
  const pathToSchemaFile = Path.resolve(specsRepo, 'output/schema/schema.json');
  log.info('loading the ES specification schema file');
  const schema = JSON.parse(fs.readFileSync(pathToSchemaFile, 'utf8')) as SpecificationTypes.Model;

  const { endpoints } = schema;
  log.info(`iterating over endpoints array: ${endpoints.length} endpoints`);
  endpoints.forEach((endpoint) => {
    const { name } = endpoint;
    log.info(name);
    const definition = generateDefinition(endpoint, schema);
    const fileContent: EndpointDefinition = {
      [name]: definition,
    };
    fs.writeFileSync(
      join(definitionsFolder, `${name}.json`),
      JSON.stringify(fileContent, null, 2) + '\n',
      'utf8'
    );
  });
}
