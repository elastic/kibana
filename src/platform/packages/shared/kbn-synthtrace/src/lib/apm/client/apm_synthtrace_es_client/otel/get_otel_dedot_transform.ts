/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Transform } from 'stream';
import type { ApmOtelFields } from '@kbn/synthtrace-client';
import { dedot } from '@kbn/synthtrace-client';

function extractAttributes(
  obj: Record<string, unknown>,
  attribute: string
): Record<string, unknown> {
  return Object.entries(obj)
    .filter(([key]) => key.startsWith(attribute))
    .reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[key.replace(`${attribute}`, '')] = value;
      return acc;
    }, {});
}

function removeAttributes(obj: Record<string, unknown>, attributes: string[]): ApmOtelFields {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) =>
      attributes.every((attribute) => !key.startsWith(attribute))
    )
  ) as ApmOtelFields;
}
export function getOtelDedotTransform(keepFlattenedFields: boolean = false) {
  return new Transform({
    objectMode: true,
    transform(document: ApmOtelFields, encoding, callback) {
      let target: Record<string, unknown>;

      if (keepFlattenedFields) {
        target =
          document['attributes.processor.event'] === 'metric' ? document : dedot(document, {});
      } else {
        const attributes = extractAttributes(document, 'attributes.');
        const resourceAttributes = extractAttributes(document, 'resource.attributes.');
        const scopeAttributes = extractAttributes(document, 'scope.attributes.');

        target = dedot(
          removeAttributes(document, ['attributes.', 'resource.attributes.', 'scope.attributes.']),
          {}
        );

        // these remain flattened
        target.attributes = attributes;
        const resource =
          typeof target.resource === 'object' && target.resource !== null
            ? (target.resource as Record<string, unknown>)
            : {};
        resource.attributes = resourceAttributes;
        target.resource = resource;

        const scope =
          typeof target.scope === 'object' && target.scope !== null
            ? (target.scope as Record<string, unknown>)
            : {};
        scope.attributes = scopeAttributes;
        target.scope = scope;
      }

      delete target.meta;
      const ts = target['@timestamp'];
      if (
        ts !== undefined &&
        (typeof ts === 'string' || typeof ts === 'number' || ts instanceof Date)
      ) {
        const parsedTs = new Date(ts);
        if (!Number.isNaN(parsedTs.valueOf())) {
          target['@timestamp'] = parsedTs.toISOString();
        }
      }

      callback(null, target);
    },
  });
}
