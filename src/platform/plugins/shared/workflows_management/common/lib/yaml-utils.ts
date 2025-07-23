/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument, Document, Scalar, visit, isPair, isSeq } from 'yaml';
import { z } from '@kbn/zod';
import { WorkflowSchema } from '@kbn/workflows';

const YAML_STRINGIFY_OPTIONS = {
  indent: 2,
  lineWidth: -1,
};

export function getYamlStringFromJSON(json: any) {
  const doc = new Document(json);
  return doc.toString(YAML_STRINGIFY_OPTIONS);
}

export function parseWorkflowYamlToJSON<T extends z.ZodSchema>(
  yamlString: string,
  schema: T = WorkflowSchema as unknown as T
): z.SafeParseReturnType<z.input<T>, z.output<T>> {
  const doc = parseDocument(yamlString);
  let json = doc.toJSON();
  if (!json.workflow) {
    json = {
      workflow: json,
    };
  }
  return schema.safeParse(json);
}

export function getCurrentPath(document: Document, absolutePosition: number) {
  const path: Array<string | number> = [];
  if (!document.contents) return [];

  visit(document, {
    Scalar(key, node, ancestors) {
      if (!node.range) return;
      if (absolutePosition >= node.range[0] && absolutePosition <= node.range[2]) {
        // Create a new array to store path components
        ancestors.forEach((ancestor, index) => {
          if (isPair(ancestor)) {
            path.push((ancestor.key as Scalar).value as string);
          } else if (isSeq(ancestor)) {
            // If ancestor is a Sequence, we need to find the index of the child item
            const childNode = ancestors[index + 1]; // Get the child node
            const seqIndex = ancestor.items.findIndex((item) => item === childNode);
            if (seqIndex !== -1) {
              path.push(seqIndex);
            }
          }
        });
        return visit.BREAK;
      }
    },
  });

  return path;
}
