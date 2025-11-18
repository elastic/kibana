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

export function getYamlDocumentErrors(document: Document): InvalidYamlSyntaxError[] {
  const errors: InvalidYamlSyntaxError[] = [];
  if (document.errors.length > 0) {
    errors.push(new InvalidYamlSyntaxError(document.errors.map((err) => err.message).join(', ')));
  }

  // Visit all pairs, and check if there're any non-scalar keys
  // TODO: replace with parseDocument(yamlString, { stringKeys: true }) when 'yaml' package updated to 2.6.1
  visit(document, {
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
      errors.push(
        new InvalidYamlSyntaxError(
          `Invalid key type: ${actualType} in ${range ? `range ${range}` : ''}`
        )
      );

      return visit.BREAK;
    },
  });

  return errors;
}
