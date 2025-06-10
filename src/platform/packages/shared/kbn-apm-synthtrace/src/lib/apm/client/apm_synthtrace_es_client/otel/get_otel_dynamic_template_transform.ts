/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Transform } from 'stream';
import {
  ApmOtelFields,
  ESDocumentWithOperation,
  SynthtraceDynamicTemplate,
} from '@kbn/apm-synthtrace-client';

export function getOtelDynamicTemplateTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ESDocumentWithOperation<ApmOtelFields>, encoding, callback) {
      const dynamicTemplates: SynthtraceDynamicTemplate[] = [];

      if (document['metrics.transaction.duration.histogram']) {
        dynamicTemplates.push({
          'metrics.transaction.duration.histogram': 'histogram',
        });
      }

      if (document['metrics.event.success_count']) {
        dynamicTemplates.push({
          'metrics.event.success_count': 'summary',
        });
      }

      if (document['metrics.transaction.duration.summary']) {
        dynamicTemplates.push({
          'metrics.transaction.duration.summary': 'summary',
        });
      }

      if (dynamicTemplates.length > 0) {
        document._dynamicTemplates = dynamicTemplates.reduce<SynthtraceDynamicTemplate>(
          (acc, curr) => Object.assign(acc, curr),
          {}
        );
      }
      callback(null, document);
    },
  });
}
