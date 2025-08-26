/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import type { Node, Scalar } from 'yaml';
import {
  Document,
  isAlias,
  isCollection,
  isDocument,
  isMap,
  isPair,
  isScalar,
  isSeq,
  parseDocument,
  visit,
} from 'yaml';

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
  schema: T
): z.SafeParseReturnType<z.input<T>, z.output<T>> | { success: false; error: Error } {
  try {
    let error: Error | undefined;
    const doc = parseDocument(yamlString);

    // Visit all pairs, and check if there're any non-scalar keys
    // TODO: replace with parseDocument(yamlString, { stringKeys: true }) when 'yaml' package updated to 2.6.1
    visit(doc, {
      Pair(_, pair) {
        if (isScalar(pair.key)) {
          return;
        }
        let actualType = 'unknown';
        const range = (pair.key as Node)?.range;
        if (isMap(pair.key)) {
          actualType = 'map';
        } else if (isSeq(pair.key)) {
          actualType = 'seq';
        } else if (isAlias(pair.key)) {
          actualType = 'alias';
        } else if (isDocument(pair.key)) {
          actualType = 'document';
        } else if (isPair(pair.key)) {
          actualType = 'pair';
        } else if (isCollection(pair.key)) {
          actualType = 'collection';
        }
        error = new Error(`Invalid key type: ${actualType} in ${range ? `range ${range}` : ''}`);
        return visit.BREAK;
      },
    });

    if (error) {
      return {
        success: false,
        error,
      };
    }

    const json = doc.toJSON();
    return schema.safeParse(json);
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
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
