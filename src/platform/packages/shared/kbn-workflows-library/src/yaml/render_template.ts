/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap, isNode, isScalar, parseDocument } from 'yaml';
import type { Pair } from 'yaml';
import type { InstallFormField } from '../types/install_form';
import type { ParsedTemplate } from './parse_template';

const METADATA_KEY = 'template-metadata';
const INSTALL_PLACEHOLDER = /__install__\.([a-zA-Z0-9_-]+)/g;

export interface RenderTemplateInput {
  template: ParsedTemplate;
  /**
   * Values to substitute for `__install__.<name>` references, keyed by field
   * name. When a name has no value here, the field's `default` (from
   * `template-metadata.install.form`) is used; when neither exists, the
   * `<name>` placeholder is emitted for display.
   */
  values?: Record<string, unknown>;
}

/**
 * Render a workflow template into plain workflow YAML.
 *
 * Works on the original `raw` string (never a parse-and-dump round trip) so the
 * author's comments and exact indentation in the workflow body are preserved
 * byte-for-byte. Two transforms are applied:
 *
 *  1. The `template-metadata` block — and any comments inside it — is removed.
 *  2. Every `__install__.<name>` reference is resolved to, in order: the
 *     matching entry in `values`, the field's `default`, or the `<name>`
 *     placeholder.
 */
export function renderTemplate({ template, values = {} }: RenderTemplateInput): string {
  const withoutMetadata = stripMetadataBlock(template.raw);
  const form = template.metadata.install?.form ?? [];
  return resolveInstallPlaceholders(withoutMetadata, form, values);
}

/**
 * Remove the top-level `template-metadata` block from a template YAML string.
 *
 * The block's boundaries come from the parsed AST — the `template-metadata`
 * pair's source range, from the key start to the value end — so its nested
 * content and inner comments are removed precisely while the rest of the
 * document (body comments, blank lines, indentation) is spliced back
 * byte-for-byte. Falls back to returning the input unchanged when the block or
 * its range cannot be resolved.
 */
function stripMetadataBlock(raw: string): string {
  const pair = findMetadataPair(raw);
  if (!pair) {
    return raw;
  }

  const { key, value } = pair;
  const start = isNode(key) ? key.range?.[0] : undefined;
  const end = isNode(value) ? value.range?.[2] : undefined;

  if (start === undefined || end === undefined) {
    return raw;
  }

  // Drop leading blank lines the removal may leave at the top of the document.
  return (raw.slice(0, start) + raw.slice(end)).replace(/^\n+/, '');
}

function findMetadataPair(raw: string): Pair | undefined {
  const doc = parseDocument(raw, { keepSourceTokens: true });
  if (!isMap(doc.contents)) {
    return undefined;
  }
  return doc.contents.items.find((item) => isScalar(item.key) && item.key.value === METADATA_KEY);
}

function resolveInstallPlaceholders(
  text: string,
  form: InstallFormField[],
  values: Record<string, unknown>
): string {
  const defaultsByName = new Map<string, InstallFormField['default']>();
  for (const field of form) {
    if (field.default !== undefined) {
      defaultsByName.set(field.name, field.default);
    }
  }

  return text.replace(INSTALL_PLACEHOLDER, (_match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(values, name) && values[name] !== undefined) {
      return String(values[name]);
    }
    const fieldDefault = defaultsByName.get(name);
    if (fieldDefault !== undefined) {
      return String(fieldDefault);
    }
    return `<${name}>`;
  });
}
