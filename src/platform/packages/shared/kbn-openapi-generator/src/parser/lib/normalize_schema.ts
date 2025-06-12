/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OpenAPIV3 } from 'openapi-types';
import { URL } from 'node:url';
import { traverseObject } from './helpers/traverse_object';
import { hasRef } from './helpers/has_ref';

function isUrl(maybeUrl: string): boolean {
  return URL.canParse(maybeUrl);
}

export function normalizeSchema(schema: OpenAPIV3.Document): OpenAPIV3.Document {
  traverseObject(schema, (element) => {
    if (!hasRef(element)) {
      return;
    }

    if (isUrl(element.$ref)) {
      throw new Error(`URL references are not supported: ${element.$ref}`);
    }

    const referenceName = element.$ref.split('/').pop();

    if (!referenceName) {
      throw new Error(`Cannot parse reference name: ${element.$ref}`);
    }

    element.referenceName = referenceName;
  });

  return schema;
}
