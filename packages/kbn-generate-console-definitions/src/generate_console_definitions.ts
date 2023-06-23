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

interface EndpointRequest {
  name: string;
  namespace: string;
}

interface Endpoint {
  name: string;
  urls: Array<{
    methods: string[];
    path: string;
  }>;
  docUrl: string;
  request: null | EndpointRequest;
}

interface SchemaType {
  name: {
    name: string;
    namespace: string;
  };
}

interface Schema {
  endpoints: Endpoint[];
  types: SchemaType[];
}

interface UrlParams {
  [key: string]: number | string;
}

interface BodyParams {
  [key: string]: number | string;
}

interface Definition {
  documentation?: string;
  methods: string[];
  patterns: string[];
  url_params?: UrlParams;
  data_autocomplete_rules?: BodyParams;
}

const generateMethods = (endpoint: Endpoint): string[] => {
  // this array consists of arrays of strings
  const methodsArray = endpoint.urls.map((url) => url.methods);
  // flatten to return array of strings
  const flattenMethodsArray = ([] as string[]).concat(...methodsArray);
  // use set to remove duplication
  return [...new Set(flattenMethodsArray)];
};

const generatePatterns = (endpoint: Endpoint): string[] => {
  return endpoint.urls.map(({ path }) => {
    let pattern = path;
    // remove leading / if present
    if (path.startsWith('/')) {
      pattern = path.substring(1);
    }
    return pattern;
  });
};

const generateDocumentation = (endpoint: Endpoint): string => {
  return endpoint.docUrl;
};

const generateParams = (
  endpoint: Endpoint,
  schema: Schema
): { urlParams: UrlParams; bodyParams: BodyParams } | undefined => {
  const { request } = endpoint;
  if (!request) {
    return;
  }
  const requestType = schema.types.find(
    ({ name: { name, namespace } }) => name === request.name && namespace === request.namespace
  );
  if (!requestType) {
    return;
  }

  const urlParams = generateUrlParams(requestType);
  const bodyParams = generateBodyParams(requestType);
  return { urlParams, bodyParams };
};

const generateUrlParams = (requestType: SchemaType): UrlParams => {
  return {};
};

const generateBodyParams = (requestType: SchemaType): BodyParams => {
  return {};
};

const addParams = (
  definition: Definition,
  params: { urlParams: UrlParams; bodyParams: BodyParams }
): Definition => {
  const { urlParams, bodyParams } = params;
  if (urlParams && Object.keys(urlParams).length > 0) {
    definition.url_params = urlParams;
  }
  if (bodyParams && Object.keys(bodyParams).length > 0) {
    definition.data_autocomplete_rules = bodyParams;
  }
  return definition;
};

const generateDefinition = (endpoint: Endpoint, schema: Schema): Definition => {
  const methods = generateMethods(endpoint);
  const patterns = generatePatterns(endpoint);
  const documentation = generateDocumentation(endpoint);
  let definition: Definition = { methods, patterns, documentation };
  const params = generateParams(endpoint, schema);
  if (params) {
    definition = addParams(definition, params);
  }

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
  const schema = JSON.parse(fs.readFileSync(pathToSchemaFile, 'utf8')) as Schema;

  const { endpoints } = schema;
  log.info(`iterating over endpoints array: ${endpoints.length} endpoints`);
  endpoints.forEach((endpoint) => {
    const { name } = endpoint;
    log.info(name);
    const definition = generateDefinition(endpoint, schema);
    const fileContent: { [name: string]: Definition } = {
      [name]: definition,
    };
    fs.writeFileSync(
      join(definitionsFolder, `${name}.json`),
      JSON.stringify(fileContent, null, 2) + '\n',
      'utf8'
    );
  });
}
