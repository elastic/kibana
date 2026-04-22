/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import { Document, isScalar, visit } from 'yaml';
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
 * Walk the document tree and set explicit scalar types to match js-yaml's
 * block-scalar heuristics:
 *   - Strings with internal '\n' → BLOCK_LITERAL (|)
 *   - Strings whose length exceeds the effective line budget, or strings with
 *     only a trailing '\n' (from a folded block scalar source) → BLOCK_FOLDED (>)
 *
 * Map keys are skipped (they must stay inline). Flow-context scalars fall back
 * to quoted strings automatically in the serialiser, so it is safe to set block
 * types unconditionally on value/sequence-item scalars.
 *
 * A trailing '\n' is stripped before the internal-newline check because the
 * yaml package appends one to folded (>) block scalars via clip-chomping.
 * Without stripping it, those long single-line values would be mis-classified
 * as BLOCK_LITERAL and re-serialised with '|' instead of '>'.
 *
 * The effective line budget mirrors js-yaml's lineWidth-aware selection: it
 * subtracts an estimated overhead (path depth + a fixed key+': ' allowance)
 * from the target line width of 80 chars. Without this, short-ish strings that
 * still exceed 80 chars when combined with their key/indentation prefix would
 * remain as plain scalars instead of being folded.
 */
const applyBlockScalarTypes = (doc: Document): void => {
  visit(doc, {
    Scalar(_key, node, path) {
      if (_key !== 'key' && typeof node.value === 'string') {
        const str = node.value;
        const hasTrailingNewline = str.endsWith('\n');
        const body = hasTrailingNewline ? str.slice(0, -1) : str;
        if (body.includes('\n')) {
          node.type = 'BLOCK_LITERAL';
        } else {
          // Estimate the line budget remaining for the scalar value after
          // accounting for indentation and key overhead. Each entry in `path`
          // contributes roughly one character of YAML indentation (the default
          // indent is 2 spaces per level, but path includes both Map/Seq nodes
          // and Pair nodes, roughly halving the effective multiplier). A fixed
          // 14-char allowance covers the key name and ': ' separator.
          const estimatedLineOverhead = path.length + 14;
          const effectiveThreshold = Math.max(20, 80 - estimatedLineOverhead);
          if (body.length > effectiveThreshold || hasTrailingNewline) {
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
      // Remove the timestamp tag from the schema so that ISO-8601 timestamp
      // strings (e.g. '2025-01-07T20:07:33.119Z') are written as plain scalars
      // rather than being quoted to prevent re-interpretation as Date objects.
      // This matches js-yaml's behaviour where timestamp strings are unquoted.
      customTags: (tags) =>
        tags.filter(
          (tag) => !(typeof tag === 'object' && tag.tag === 'tag:yaml.org,2002:timestamp')
        ),
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
      customTags: (tags) =>
        tags.filter(
          (tag) => !(typeof tag === 'object' && tag.tag === 'tag:yaml.org,2002:timestamp')
        ),
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
