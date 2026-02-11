/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Node } from 'yaml';
import { isAlias, isCollection, isDocument, isMap, isPair, isScalar, isSeq, visit } from 'yaml';
import { InvalidYamlSyntaxError } from '../errors';

export interface YamlDocumentError {
  message: string;
  /** Character offset range [start, valueEnd, nodeEnd] from the YAML node, if available */
  range?: [number, number, number];
}

export function getYamlDocumentErrors(document: Document): InvalidYamlSyntaxError[] {
  return getYamlDocumentErrorsDetailed(document).map(
    (err) => new InvalidYamlSyntaxError(err.message)
  );
}

/**
 * Returns detailed errors with range information for use in editor validation.
 * Detects:
 * - Non-scalar keys (e.g. flow mappings used as keys)
 * - Flow mapping values (e.g. `comment: {{ inputs.comment }}`)
 * Note: Flow sequences (e.g. `tags: [tag1, tag2]`) are allowed.
 */
export function getYamlDocumentErrorsDetailed(document: Document): YamlDocumentError[] {
  const errors: YamlDocumentError[] = [];
  if (document.errors.length > 0) {
    errors.push({
      message: document.errors.map((err) => err.message).join(', '),
    });
  }

  // Visit all pairs, and check if there're any non-scalar keys
  // TODO: replace with parseDocument(yamlString, { stringKeys: true }) when 'yaml' package updated to 2.6.1
  visit(document, {
    Pair(_, pair) {
      if (isScalar(pair.key)) {
        // Check for flow mapping values (e.g. `comment: {{ inputs.comment }}`)
        // Flow sequences (e.g. `tags: [tag1, tag2]`) are allowed.
        const value = pair.value as Node | null;
        if (value && isMap(value)) {
          const collection = value as {
            flow?: boolean;
            range?: [number, number, number] | null;
          };
          if (collection.flow) {
            errors.push({
              message: `Flow mapping syntax is not allowed. For template expressions, use quotes, e.g. "{{ inputs.comment }}"`,
              range: collection.range ?? undefined,
            });
            // Skip visiting children of the flow mapping to avoid
            // duplicate errors (e.g. non-scalar keys inside {{ }})
            return visit.SKIP;
          }
        }
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
      errors.push({
        message: `Invalid key type: ${actualType} in ${range ? `range ${range}` : ''}`,
        range: range ?? undefined,
      });
    },
  });

  return errors;
}
