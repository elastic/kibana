/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { ENDPOINTS_SUBFOLDER, GLOBALS_SUBFOLDER } from '@kbn/console-plugin/common/constants';
import { generateQueryParams } from './generate_query_params';
import { generateAvailability } from './generate_availability';
import type {
  AutocompleteBodyParams,
  AutocompleteDefinition,
  AutocompleteUrlParams,
  SpecificationTypes,
} from './types';
import {
  createFolderIfDoesntExist,
  emptyFolder,
  findTypeDefinition,
  saveJsonToFile,
} from './utils';
import { BodyParamsConverter } from './body_params_converter';

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

const generateParams = ({
  endpoint,
  schema,
  bodyParamsConverter,
}: {
  endpoint: SpecificationTypes.Endpoint;
  schema: SpecificationTypes.Model;
  bodyParamsConverter: BodyParamsConverter;
}): { urlParams: AutocompleteUrlParams; bodyParams: AutocompleteBodyParams } | undefined => {
  const { request } = endpoint;
  if (!request) {
    return;
  }
  const requestTypeDefinition = findTypeDefinition(schema, request);
  if (!requestTypeDefinition) {
    return;
  }

  const requestType = requestTypeDefinition as SpecificationTypes.Request;
  const urlParams = generateQueryParams(requestType, schema);
  const bodyParams = bodyParamsConverter.generate(requestType.body);
  return { urlParams, bodyParams };
};

const addParams = (
  definition: AutocompleteDefinition,
  params: { urlParams: AutocompleteUrlParams; bodyParams: AutocompleteBodyParams }
): AutocompleteDefinition => {
  const { urlParams, bodyParams } = params;
  if (urlParams && Object.keys(urlParams).length > 0) {
    definition.url_params = urlParams;
  }
  if (bodyParams && Object.keys(bodyParams).length > 0) {
    definition.data_autocomplete_rules = bodyParams;
  }
  return definition;
};

const generateDefinition = ({
  endpoint,
  schema,
  bodyParamsConverter,
}: {
  endpoint: SpecificationTypes.Endpoint;
  schema: SpecificationTypes.Model;
  bodyParamsConverter: BodyParamsConverter;
}): AutocompleteDefinition => {
  const methods = generateMethods(endpoint);
  const patterns = generatePatterns(endpoint);
  const documentation = generateDocumentation(endpoint);
  const availability = generateAvailability(endpoint);
  let definition: AutocompleteDefinition = {};
  const params = generateParams({ endpoint, schema, bodyParamsConverter });
  if (params) {
    definition = addParams(definition, params);
  }
  definition = { ...definition, methods, patterns, documentation, availability };

  return definition;
};

export function generateConsoleDefinitions({
  specsRepo,
  generatedFilesFolder,
  log,
}: {
  specsRepo: string;
  generatedFilesFolder: string;
  log: ToolingLog;
}) {
  const pathToSchemaFile = Path.resolve(specsRepo, 'output/schema/schema.json');
  log.info('loading the ES specification schema file');
  const schema = JSON.parse(fs.readFileSync(pathToSchemaFile, 'utf8')) as SpecificationTypes.Model;

  // convert endpoints
  const definitionsFolder = Path.resolve(generatedFilesFolder, ENDPOINTS_SUBFOLDER);
  createFolderIfDoesntExist(definitionsFolder, log);
  emptyFolder(definitionsFolder, log);
  const { endpoints } = schema;
  log.info(`iterating over endpoints array: ${endpoints.length} endpoints`);
  const bodyParamsConverter = new BodyParamsConverter(schema);
  endpoints.forEach((endpoint) => {
    const { name } = endpoint;
    log.info(name);
    const definition = generateDefinition({ endpoint, schema, bodyParamsConverter });
    const fileContent: { [name: string]: AutocompleteDefinition } = {
      [name]: definition,
    };
    saveJsonToFile({ folder: definitionsFolder, name, fileContent });
  });

  // convert global types needed for endpoint definitions
  const globalsFolder = Path.resolve(generatedFilesFolder, GLOBALS_SUBFOLDER);
  createFolderIfDoesntExist(globalsFolder, log);
  emptyFolder(globalsFolder, log);
  const globalTypes = bodyParamsConverter.getGlobalTypes();
  log.info(`generating definitions for global types`);
  log.info({ globalTypes });
  const globalDefinitions = bodyParamsConverter.convertGlobals();
  globalDefinitions.forEach((globalDefinition) => {
    const { name, params } = globalDefinition;
    log.info(name);
    if (params && Object.keys(params).length > 0) {
      const fileContent = { [name]: params };
      saveJsonToFile({ folder: globalsFolder, name, fileContent });
    }
  });
}
