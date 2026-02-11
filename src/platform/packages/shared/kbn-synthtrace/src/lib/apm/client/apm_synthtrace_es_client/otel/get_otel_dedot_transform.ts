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

function extractAttributes(obj: Record<string, any>, attribute: string) {
  return Object.entries(obj)
    .filter(([key]) => key.startsWith(attribute))
    .reduce((acc, [key, value]) => {
      acc[key.replace(`${attribute}`, '')] = value;
      return acc;
    }, {} as Record<string, any>);
}

function removeAttributes(obj: Record<string, any>, attributes: string[]): ApmOtelFields {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) =>
      attributes.every((attribute) => !key.startsWith(attribute))
    )
  );
}
export function getOtelDedotTransform(keepFlattenedFields: boolean = false) {
  return new Transform({
    objectMode: true,
    transform(document: ApmOtelFields, encoding, callback) {
      let target: Record<string, any>;

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
        target.resource = target.resource || {};
        target.resource.attributes = resourceAttributes;
        target.scope = target.scope || {};
        target.scope.attributes = scopeAttributes;
      }

      delete target.meta;
      if (target['@timestamp']) {
        target['@timestamp'] = new Date(target['@timestamp']).toISOString();
      }

      callback(null, target);
    },
  });
}
