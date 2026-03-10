/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { parseDocument } from 'yaml';

type ParseYamlToJSONWithoutValidationResult =
  | {
      success: false;
      error: Error;
      document: Document;
    }
  | {
      success: true;
      json: Record<string, unknown>;
      document: Document;
    };

/**
 * Parse a YAML string to a JSON object. This function is dangerous because it does not use schema to validate the resulting JSON object.
 * @param yamlString - The YAML string to parse.
 * @returns The JSON object and the YAML document. The document is always
 *   available regardless of success/failure because `parseDocument` is
 *   error-tolerant.
 */
export function parseYamlToJSONWithoutValidation(
  yamlString: string
): ParseYamlToJSONWithoutValidationResult {
  /*
  Previously parseDocument was inside the try.
  The yaml library's parseDocument is designed to be error-tolerant (it stores errors on the Document, it does not throw).
  The risk of an actual throw is near-zero and the benefit (always having a Document) outweighs it: moving it outside means 
  a truly pathological input that causes parseDocument itself to throw (not just produce document errors) would now 
  propagate as an unhandled exception instead of returning { success: false }.
  
*/

  // mapAsMap: true prevents console warning about collection values being stringified
  // TypeScript types don't include this option, but it exists at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = parseDocument(yamlString, { mapAsMap: true } as any);

  try {
    return {
      success: true,
      // mapAsMap: false ensures plain objects are returned instead of Map instances
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json: doc.toJSON({ mapAsMap: false } as any) as Record<string, unknown>,
      document: doc,
    };
  } catch (error) {
    return {
      success: false,
      error,
      document: doc,
    };
  }
}
