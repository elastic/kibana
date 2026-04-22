/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import { Document, isMap, isScalar, isSeq, visit } from 'yaml';
import type { Pair } from 'yaml';
import { dirname } from 'path';

export async function writeYamlDocument(filePath: string, document: unknown): Promise<void> {
  try {
    const yaml = stringifyToYaml(document);

    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, yaml);
  } catch (e) {
    throw new Error(`Unable to write bundled yaml: ${e.message}`, { cause: e });
  }
}

/**
 * Safety net: if any Scalar node holds a Date value, convert it back to a full
 * ISO-8601 string and force plain style so the time component and timezone
 * suffix are preserved and the value is written unquoted (matching js-yaml).
 *
 * In normal operation the read step (schema: 'core') never creates Date objects,
 * so this visitor is a no-op. It guards against unexpected Date values that
 * could arise from other code paths.
 */
const preserveDateTimestamps = (doc: Document): void => {
  visit(doc, {
    Scalar(_key, node) {
      if (node.value instanceof Date) {
        node.value = node.value.toISOString();
        node.type = 'PLAIN';
      }
    },
  });
};

/**
 * Returns true for string values that cannot be written as YAML plain scalars
 * and therefore must be quoted. BLOCK_FOLDED should not be forced for these —
 * the yaml serialiser will choose single quotes automatically.
 *
 * The characters checked are those that are illegal at the start of a plain
 * scalar per the YAML 1.1 spec. In OpenAPI the primary case is $ref values
 * that start with '#' (which would otherwise be parsed as a YAML comment).
 */
function requiresQuoting(str: string): boolean {
  if (str.length === 0) return false;
  return '#*&!|>\'":?@`'.includes(str[0]);
}

/**
 * Walk the document tree and set explicit scalar types to match js-yaml's
 * block-scalar heuristics:
 *   - Multi-line strings whose first line exceeds the effective line budget →
 *     BLOCK_FOLDED (>), matching js-yaml's hasFoldableLine check.
 *   - Multi-line strings whose first line fits within the budget (e.g.
 *     structured code samples like curl commands) → BLOCK_LITERAL (|), to
 *     preserve embedded newlines as-is.
 *   - Single-line strings whose length exceeds the effective line budget for
 *     the current nesting depth → BLOCK_FOLDED (>-)
 *   - All other strings → no override (PLAIN)
 *
 * Map keys are skipped (they must stay inline). Strings that cannot be YAML
 * plain scalars (e.g. those starting with '#') are also skipped — the yaml
 * serialiser will quote them naturally.
 *
 * A trailing '\n' is stripped before the internal-newline check because the
 * yaml package appends one to folded (>) block scalars via clip-chomping;
 * without stripping it those values would be mis-classified.
 *
 * The effective line budget replicates js-yaml's lineWidth formula:
 *   effectiveWidth = Math.max(80 - 2 * (depth + 1), 40)
 * where depth is the number of Map/Seq ancestor nodes in the AST path.
 * The threshold is applied to the VALUE string length alone (not the full
 * line width including indentation and key prefix).
 */
const applyBlockScalarTypes = (doc: Document): void => {
  visit(doc, {
    Scalar(_key, node, path) {
      if (_key !== 'key' && typeof node.value === 'string') {
        const str = node.value;
        const hasTrailingNewline = str.endsWith('\n');
        const body = hasTrailingNewline ? str.slice(0, -1) : str;
        const depth = path.filter((n) => isMap(n) || isSeq(n)).length;
        const effectiveWidth = Math.max(80 - 2 * (depth + 1), 40);
        if (body.includes('\n') || hasTrailingNewline) {
          // js-yaml uses hasFoldableLine to decide FOLDED vs LITERAL: if the
          // first line is long enough to be folded it picks BLOCK_FOLDED (>),
          // otherwise BLOCK_LITERAL (|) to preserve structured content (e.g.
          // curl examples) verbatim. The check is strict (>) matching
          // js-yaml's `lineTotal > lineWidth` condition.
          const firstLine = body.split('\n')[0];
          node.type = firstLine.length > effectiveWidth ? 'BLOCK_FOLDED' : 'BLOCK_LITERAL';
        } else {
          // Strings that cannot be plain YAML scalars (e.g. '#/...' $ref
          // values) must be quoted — don't force BLOCK_FOLDED on them.
          if (requiresQuoting(body)) return;
          // Replicate js-yaml's lineWidth-based folding decision.
          // The check is strict (>) matching js-yaml's `lineTotal > lineWidth`.
          if (body.length > effectiveWidth) {
            node.type = 'BLOCK_FOLDED';
          }
        }
      }
    },
  });
};

const prepareDocument = (doc: Document): void => {
  preserveDateTimestamps(doc);
  applyBlockScalarTypes(doc);
};

function stringifyToYaml(document: unknown): string {
  try {
    // Disable YAML Anchors https://yaml.org/spec/1.2.2/#3222-anchors-and-aliases
    // It makes YAML much more human readable
    const doc = new Document(document, {
      aliasDuplicateObjects: false,
      sortMapEntries: sortYamlKeys,
      // Use yaml-1.1 schema so that date-like strings (e.g. '2023-10-31') and
      // extended boolean literals (yes/no/on/off/…) are automatically quoted,
      // matching the behaviour of js-yaml's default schema.
      schema: 'yaml-1.1',
      strict: false,
    });
    prepareDocument(doc);
    // Prefer single quotes over double quotes when a string requires quoting,
    // matching js-yaml's default style. The serialiser falls back to double
    // quotes automatically when the value contains a single quote but no
    // double quote (e.g. "status: 'inactive'" stays double-quoted).
    return doc.toString({ singleQuote: true });
  } catch (e) {
    // Try to stringify with YAML Anchors enabled
    const doc = new Document(document, {
      aliasDuplicateObjects: true,
      sortMapEntries: sortYamlKeys,
      schema: 'yaml-1.1',
      strict: false,
    });
    prepareDocument(doc);
    return doc.toString({ singleQuote: true });
  }
}

function sortYamlKeys(a: Pair, b: Pair): number {
  if (!isScalar(a.key) || !isScalar(b.key)) {
    return 0;
  }
  const keyA = a.key.value;
  const keyB = b.key.value;
  if (typeof keyA !== 'string' || typeof keyB !== 'string') {
    return 0;
  }
  if (keyA in FIELDS_ORDER && keyB in FIELDS_ORDER) {
    return FIELDS_ORDER[keyA as CustomOrderedField] - FIELDS_ORDER[keyB as CustomOrderedField];
  }

  return keyA.localeCompare(keyB);
}

const FIELDS_ORDER = {
  // root level fields
  openapi: 1,
  info: 2,
  servers: 3,
  paths: 4,
  components: 5,
  security: 6,
  tags: 7,
  externalDocs: 8,
  // object schema fields
  type: 9,
  properties: 10,
  required: 11,
} as const;

type CustomOrderedField = keyof typeof FIELDS_ORDER;
