/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { OpenAPIV3 } from 'openapi-types';
import { KNOWN_HTTP_METHODS } from './http_methods';
import { isRefNode } from '../process_document';
import { MergeOptions } from './merge_options';

export function mergeOperations(
  sourcePathItem: OpenAPIV3.PathItemObject,
  mergedPathItem: OpenAPIV3.PathItemObject,
  options: MergeOptions
) {
  for (const httpMethod of KNOWN_HTTP_METHODS) {
    const sourceOperation = sourcePathItem[httpMethod];
    const mergedOperation = mergedPathItem[httpMethod];

    if (!sourceOperation) {
      continue;
    }

    // Adding tags before merging helps to reuse already existing functionality
    // without changes. It imitates a case when such tags already existed in source operations.
    const extendedTags = [
      ...(options.addTags?.map((t) => t.name) ?? []),
      ...(sourceOperation.tags ?? []),
    ];
    const normalizedSourceOperation = {
      ...sourceOperation,
      ...(options.skipServers ? { servers: undefined } : { servers: sourceOperation.servers }),
      ...(options.skipSecurity ? { security: undefined } : { security: sourceOperation.security }),
      ...(extendedTags.length > 0 ? { tags: extendedTags } : {}),
    };

    if (!mergedOperation || deepEqual(normalizedSourceOperation, mergedOperation)) {
      mergedPathItem[httpMethod] = normalizedSourceOperation;
      continue;
    }

    mergeOperation(normalizedSourceOperation, mergedOperation);
  }
}

function mergeOperation(
  sourceOperation: OpenAPIV3.OperationObject,
  mergedOperation: OpenAPIV3.OperationObject
) {
  if (
    !deepEqual(
      omit(sourceOperation, ['requestBody', 'responses']),
      omit(mergedOperation, ['requestBody', 'responses'])
    )
  ) {
    throw new Error('Operation objects are incompatible');
  }

  mergeRequestBody(sourceOperation, mergedOperation);
  mergeResponses(sourceOperation, mergedOperation);
}

function mergeRequestBody(
  sourceOperation: OpenAPIV3.OperationObject,
  mergedOperation: OpenAPIV3.OperationObject
): void {
  if (isRefNode(sourceOperation.requestBody)) {
    throw new Error('Request body top level $ref is not supported');
  }

  if (!sourceOperation.requestBody) {
    return;
  }

  if (!mergedOperation.requestBody) {
    mergedOperation.requestBody = sourceOperation.requestBody;
    return;
  }

  const mergedOperationRequestBody = mergedOperation.requestBody as OpenAPIV3.RequestBodyObject;

  if (!mergedOperationRequestBody.content) {
    mergedOperationRequestBody.content = {};
  }

  for (const mimeType of Object.keys(sourceOperation.requestBody.content)) {
    if (mergedOperationRequestBody.content[mimeType]) {
      throw new Error(`Duplicated request MIME type "${mimeType}". Please fix the conflict.`);
    }

    mergedOperationRequestBody.content[mimeType] = sourceOperation.requestBody.content[mimeType];
  }
}

function mergeResponses(
  sourceOperation: OpenAPIV3.OperationObject,
  mergedOperation: OpenAPIV3.OperationObject
): void {
  for (const httpStatusCode of Object.keys(sourceOperation.responses)) {
    const sourceResponseObj = sourceOperation.responses[httpStatusCode];

    if (isRefNode(sourceResponseObj)) {
      throw new Error('Response object top level $ref is not supported');
    }

    if (!sourceResponseObj.content) {
      continue;
    }

    const mergedResponseObj = mergedOperation.responses[httpStatusCode] as OpenAPIV3.ResponseObject;

    if (!mergedResponseObj.content) {
      mergedResponseObj.content = {};
    }

    for (const mimeType of Object.keys(sourceResponseObj.content)) {
      if (mergedResponseObj.content[mimeType]) {
        throw new Error(`Duplicated response MIME type "${mimeType}". Please fix the conflict.`);
      }

      mergedResponseObj.content[mimeType] = sourceResponseObj.content[mimeType];
    }
  }
}
