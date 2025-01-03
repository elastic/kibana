/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OpenAPIV3 } from 'openapi-types';
import { ResolvedDocument } from '../ref_resolver/resolved_document';
import { isRefNode } from '../process_document';
import { getOasDocumentVersion } from '../../utils/get_oas_document_version';
import { KNOWN_HTTP_METHODS } from './http_methods';

const DEFAULT_API_VERSION = '2023-10-31';
const VERSION_REGEX = /\d{4}-\d{2}-\d{2}/;

export function enrichWithVersionMimeParam(resolvedDocuments: ResolvedDocument[]): void {
  for (const resolvedDocument of resolvedDocuments) {
    const version = extractApiVersion(resolvedDocument);
    const paths = resolvedDocument.document.paths as OpenAPIV3.PathsObject;

    for (const path of Object.keys(paths ?? {})) {
      const pathItemObj = paths[path];

      for (const httpVerb of KNOWN_HTTP_METHODS) {
        const operationObj = pathItemObj?.[httpVerb];

        if (operationObj?.requestBody && !isRefNode(operationObj.requestBody)) {
          const requestBodyContent = operationObj.requestBody.content;

          enrichContentWithVersion(requestBodyContent, version);
        }

        enrichCollection(operationObj?.responses ?? {}, version);
      }
    }

    if (resolvedDocument.document.components) {
      const components = resolvedDocument.document.components as OpenAPIV3.ComponentsObject;

      if (components.requestBodies) {
        enrichCollection(components.requestBodies, version);
      }

      if (components.responses) {
        enrichCollection(components.responses, version);
      }
    }
  }
}

function enrichCollection(
  collection: Record<
    string,
    { content?: Record<string, OpenAPIV3.MediaTypeObject> } | OpenAPIV3.ReferenceObject
  >,
  version: string
) {
  for (const name of Object.keys(collection)) {
    const obj = collection[name];

    if (!obj || isRefNode(obj) || !obj.content) {
      continue;
    }

    enrichContentWithVersion(obj.content, version);
  }
}

function enrichContentWithVersion(
  content: Record<string, OpenAPIV3.MediaTypeObject>,
  version: string
): void {
  for (const mimeType of Object.keys(content)) {
    if (mimeType.includes('; Elastic-Api-Version=')) {
      continue;
    }

    const mimeTypeWithVersionParam = `${mimeType}; Elastic-Api-Version=${version}`;

    content[mimeTypeWithVersionParam] = content[mimeType];
    delete content[mimeType];
  }
}

function extractApiVersion(resolvedDocument: ResolvedDocument): string {
  const version = getOasDocumentVersion(resolvedDocument);

  if (!VERSION_REGEX.test(version)) {
    return DEFAULT_API_VERSION;
  }

  return version < DEFAULT_API_VERSION ? DEFAULT_API_VERSION : version;
}
