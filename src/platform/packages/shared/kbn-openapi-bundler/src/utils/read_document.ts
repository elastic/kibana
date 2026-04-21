/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import { basename, extname } from 'path';
import { parseDocument, visit } from 'yaml';
import chalk from 'chalk';
import { logger } from '../logger';
import { isPlainObjectType } from './is_plain_object_type';

export async function readDocument(documentPath: string): Promise<Record<string, unknown>> {
  logger.debug(`Reading ${chalk.bold(basename(documentPath))}`);

  const maybeDocument = await readFile(documentPath);

  if (!isPlainObjectType(maybeDocument)) {
    throw new Error(`File at ${chalk.bold(documentPath)} is not valid OpenAPI document`);
  }

  return maybeDocument;
}

async function readFile(filePath: string): Promise<unknown> {
  const extension = extname(filePath);

  switch (extension) {
    case '.yaml':
    case '.yml':
      return await readYamlFile(filePath);

    case '.json':
      return await readJsonFile(filePath);

    default:
      throw new Error(`${extension} files are not supported`);
  }
}

async function readYamlFile(filePath: string): Promise<Record<string, unknown>> {
  let fileContent = await fs.readFile(filePath, { encoding: 'utf8' });

  fileContent = normalizeSingleQuotedScalars(fileContent);

  // yaml-1.1 parses ISO timestamp strings as Date objects. We fix them up in
  // the AST before converting to JS so we can inspect node.source to
  // distinguish full timestamps from date-only strings:
  //   - Full timestamps (source contains a time component, e.g. T00:00:00)
  //     are converted to their full ISO-8601 string via toISOString(), so
  //     midnight dates like 2024-12-31T00:00:00Z are never truncated to
  //     2024-12-31.
  //   - Date-only timestamps (YYYY-MM-DD, e.g. an API version field) keep the
  //     date-only format so their value is not altered.
  //
  // Using parseDocument + visit (rather than parse + reviver) also avoids a
  // "Maximum call stack size exceeded" crash that the reviver triggers when
  // yaml builds circular JS objects for recursive YAML anchors, because the
  // AST visitor never performs instanceof checks on complex JS objects.
  const doc = parseDocument(fileContent, { schema: 'yaml-1.1', strict: false });
  visit(doc, {
    Scalar(_key, node) {
      if (node.value instanceof Date) {
        const src = node.source ?? '';
        node.value = /T\d{2}:\d{2}:\d{2}/i.test(src)
          ? node.value.toISOString()
          : node.value.toISOString().slice(0, 10);
      }
    },
  });
  const maybeObject = doc.toJS();

  if (!isPlainObjectType(maybeObject)) {
    throw new Error(
      `Expected ${chalk.bold(filePath)} to contain an object but got ${typeof maybeObject}`
    );
  }

  return maybeObject;
}

/**
 * Folds multi-line single-quoted YAML scalars that the yaml package rejects
 * (continuation lines not indented beyond the current block level, a pattern
 * accepted by js-yaml). Each such span is collapsed to a single line by
 * replacing line-breaks and their leading whitespace with a single space,
 * matching YAML's flow-scalar line-folding semantics.
 *
 * Block scalar content (lines after a `|` or `>` header) is masked before the
 * regex runs so that literal `'` characters inside verbatim text — e.g. curl
 * example JSON bodies like `-d '{ ... }'` — are never treated as YAML scalar
 * delimiters. The original content is restored verbatim after normalisation.
 */
function normalizeSingleQuotedScalars(fileContent: string): string {
  const placeholders: string[] = [];
  const lines = fileContent.split('\n');
  const maskedLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect a block scalar header: a line whose YAML value is | or > with
    // optional chomping/indent modifiers and an optional trailing comment.
    if (/(?::\s*|-\s+)[|>](?:[+\-]?\d?|\d?[+\-]?)\s*(?:#[^\r\n]*)?\s*$/.test(line)) {
      maskedLines.push(line);
      i++;

      // Preserve any empty lines that precede the first content line.
      while (i < lines.length && lines[i].trim() === '') {
        maskedLines.push(lines[i++]);
      }

      if (i >= lines.length) {
        continue;
      }

      // Content indentation is determined by the first non-empty content line.
      const contentIndent = (lines[i].match(/^(\s*)/) ?? ['', ''])[1].length;

      // Collect all lines that belong to this block scalar (empty lines are
      // always part of the block; non-empty lines end the block when their
      // indentation is less than contentIndent).
      const blockLines: string[] = [];
      while (i < lines.length) {
        const bLine = lines[i];
        const indent =
          bLine.trim() === '' ? Infinity : (bLine.match(/^(\s*)/) ?? ['', ''])[1].length;
        if (indent < contentIndent) break;
        blockLines.push(bLine);
        i++;
      }

      const token = `\x00BLOCK_${placeholders.length}\x00`;
      placeholders.push(blockLines.join('\n'));
      maskedLines.push(token);
      continue;
    }

    maskedLines.push(line);
    i++;
  }

  // Apply the single-quoted normalisation only to the non-block-scalar regions.
  // The lookbehind (?<=[\s\[{,:]) restricts matches to ' characters that open a
  // YAML single-quoted scalar (preceded by whitespace or a flow-context
  // structural character), preventing matches on bare apostrophes inside plain
  // scalars (e.g. "alerts'" where ' is preceded by a word character).
  let masked = maskedLines.join('\n');
  masked = masked.replace(/(?<=[\s\[{,:])'(?:[^']|'')*'/gs, (match) =>
    match.includes('\n') ? match.replace(/\r?\n[ \t]*/g, ' ') : match
  );

  // Restore each block scalar's original verbatim content.
  // Use a replacer function (not a string) so that $ characters in the
  // placeholder are never interpreted as replacement patterns ($&, $', etc.).
  for (let j = 0; j < placeholders.length; j++) {
    masked = masked.replace(`\x00BLOCK_${j}\x00`, () => placeholders[j]);
  }

  return masked;
}

async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  const fileContent = await fs.readFile(filePath, { encoding: 'utf8' });

  try {
    const maybeObject = JSON.parse(fileContent);

    if (!isPlainObjectType(maybeObject)) {
      throw new Error(
        `Expected ${chalk.bold(filePath)} to contain an object but got ${typeof maybeObject}`
      );
    }

    return maybeObject;
  } catch {
    throw new Error(`Unable to parse ${chalk.bold(filePath)}`);
  }
}
