/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';

// 'ingest._types.UserAgentProcessor.properties' has a default value of array of strings, some of which are not in enum
const enumsToExtend = {
  'ingest._types.UserAgentProperty': {
    enum: [
      'name',
      'major',
      'minor',
      'patch',
      'build',
      'os',
      'os_name',
      'os_major',
      'os_minor',
      'device',
    ],
  },
};

export function alignDefaultWithEnum(document: OpenAPIV3.Document) {
  if (!document.components || !document.components.schemas) {
    return document;
  }
  document.components.schemas = Object.fromEntries(
    Object.entries(document.components.schemas).map(([key, value]) => {
      if ('$ref' in value || !(key in enumsToExtend) || !value.enum) {
        return [key, value];
      }
      const extendedValue = {
        ...value,
        enum: [
          Array.from(
            new Set([
              ...value.enum,
              ...(enumsToExtend[key as keyof typeof enumsToExtend].enum ?? []),
            ])
          ),
        ],
      };
      return [key, extendedValue];
    })
  );
  return document;
}
