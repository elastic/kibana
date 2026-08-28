/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse, parseDocument, visit } from 'yaml';
import { i18n } from '@kbn/i18n';
import { assertNever } from '@kbn/std';
import type { InstallFormField } from '../types/install_form';
import { InstallFormValidationError } from './install_form_validation_error';
import type { InstallFormFieldError } from './install_form_validation_error';
import { MissingInstallFormFieldError } from './missing_install_form_field_error';
import type { ParsedTemplate } from './parse_template';
import { stripMetadataBlock } from './render_template';

const INSTALL_PLACEHOLDER = /__install__\.([a-zA-Z0-9_-]+)/g;
const EXACT_INSTALL_PLACEHOLDER = /^__install__\.([a-zA-Z0-9_-]+)$/;

const REQUIRED_VALUE_ERROR = i18n.translate(
  'workflows.library.installForm.validation.requiredValue',
  { defaultMessage: 'A value is required.' }
);

const EXPECTED_STRING_ERROR = i18n.translate(
  'workflows.library.installForm.validation.expectedString',
  { defaultMessage: 'Expected a string.' }
);

/**
 * User-facing validation messages keyed by `install.form` field `inputType`.
 * Parameterized messages are functions; the rest are plain translated strings.
 */
const INPUT_VALIDATION_ERRORS = {
  text: EXPECTED_STRING_ERROR,
  textarea: EXPECTED_STRING_ERROR,
  number: i18n.translate('workflows.library.installForm.validation.expectedNumber', {
    defaultMessage: 'Expected a finite number.',
  }),
  boolean: i18n.translate('workflows.library.installForm.validation.expectedBoolean', {
    defaultMessage: 'Expected a boolean.',
  }),
  select: (allowed: string[]) =>
    i18n.translate('workflows.library.installForm.validation.expectedOption', {
      defaultMessage: 'Must be one of: {allowed}.',
      values: { allowed: allowed.join(', ') },
    }),
  connector: i18n.translate('workflows.library.installForm.validation.expectedConnector', {
    defaultMessage: 'Expected a connector ID.',
  }),
  esIndex: i18n.translate('workflows.library.installForm.validation.expectedIndex', {
    defaultMessage: 'Expected an index name.',
  }),
} as const;

/**
 * Validate resolved install-form values against the declared form.
 *
 * Returns field-level errors instead of throwing so the UI can reuse it for
 * live client-side validation; `renderInstall` throws
 * `InstallFormValidationError` when the result is non-empty.
 */
export function validateInstallFormValues(
  form: InstallFormField[],
  values: Record<string, unknown>
): InstallFormFieldError[] {
  const errors: InstallFormFieldError[] = [];

  for (const field of form) {
    const value = values[field.name];

    if (value === undefined || value === '') {
      if (field.required) {
        errors.push({ field: field.name, reason: REQUIRED_VALUE_ERROR });
      }
      continue;
    }

    const reason = validateFieldValue(field, value);
    if (reason) {
      errors.push({ field: field.name, reason });
    }
  }

  return errors;
}

function validateFieldValue(field: InstallFormField, value: unknown): string | undefined {
  switch (field.inputType) {
    case 'text':
    case 'textarea':
      return typeof value === 'string' ? undefined : INPUT_VALIDATION_ERRORS[field.inputType];
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? undefined
        : INPUT_VALIDATION_ERRORS.number;
    case 'boolean':
      return typeof value === 'boolean' ? undefined : INPUT_VALIDATION_ERRORS.boolean;
    case 'select': {
      if (typeof value !== 'string') {
        return EXPECTED_STRING_ERROR;
      }
      return field.options.some((option) => option.value === value)
        ? undefined
        : INPUT_VALIDATION_ERRORS.select(field.options.map((option) => option.value));
    }
    case 'connector':
      return typeof value === 'string' && value.trim().length > 0
        ? undefined
        : INPUT_VALIDATION_ERRORS.connector;
    case 'esIndex':
      return typeof value === 'string' && value.trim().length > 0
        ? undefined
        : INPUT_VALIDATION_ERRORS.esIndex;
    // A new `inputType` must get an explicit branch above; TS fails here
    // otherwise, so values never silently pass this server-side validation.
    default:
      return assertNever(field);
  }
}

export interface RenderInstallInput {
  template: ParsedTemplate;
  /** User-submitted form values, keyed by `install.form` field name. */
  values?: Record<string, unknown>;
}

export interface RenderInstallResult {
  /** Fully resolved workflow YAML, ready to feed into the create-workflow path. */
  yaml: string;
  /** The value map actually substituted: submitted values plus applied form defaults. */
  resolved: Record<string, unknown>;
}

/**
 * Render a template into concrete workflow YAML for installation.
 *
 * The strict counterpart of `renderTemplate` (which stays lenient for the
 * read-only preview). Same raw-text mechanism — the `template-metadata` block
 * is stripped via its AST source range and the body's comments / indentation
 * are preserved byte-for-byte — but with install-grade guarantees:
 *
 *  1. Resolved values (submitted values, falling back to form `default`s) are
 *     validated against the declared `install.form` — throws
 *     `InstallFormValidationError` with field-level details.
 *  2. A body reference to an undeclared `__install__.<name>` throws
 *     `MissingInstallFormFieldError`; a reference to a declared field that has
 *     no resolved value throws `InstallFormValidationError`. Never the
 *     preview's `<name>` fallback.
 *  3. Substitution is YAML-safe: a placeholder that spans a whole scalar is
 *     re-emitted as a properly encoded YAML scalar (numbers / booleans bare,
 *     strings quoted when bare emission would change meaning); placeholders
 *     inside longer strings are interpolated and the scalar re-encoded.
 *     Placeholders in YAML comments are left untouched.
 */
export function renderInstall({ template, values = {} }: RenderInstallInput): RenderInstallResult {
  const form = template.metadata.install?.form ?? [];
  const resolved = resolveValues(form, values);

  const errors = validateInstallFormValues(form, resolved);
  if (errors.length > 0) {
    throw new InstallFormValidationError(errors);
  }

  const yaml = substituteInstallPlaceholders(stripMetadataBlock(template.raw), form, resolved);
  return { yaml, resolved };
}

/**
 * Submitted value when present, otherwise the field's declared `default`.
 * `undefined` and `''` both mean "not provided" (an empty form input), so
 * defaults apply and `required` validation fires consistently for both.
 */
function resolveValues(
  form: InstallFormField[],
  values: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const field of form) {
    const value = values[field.name];
    if (value !== undefined && value !== '') {
      resolved[field.name] = value;
    } else if (field.default !== undefined) {
      resolved[field.name] = field.default;
    }
  }
  return resolved;
}

interface SourceEdit {
  start: number;
  end: number;
  text: string;
}

function substituteInstallPlaceholders(
  source: string,
  form: InstallFormField[],
  resolved: Record<string, unknown>
): string {
  const declared = new Set(form.map((field) => field.name));
  const undeclared = new Set<string>();
  const unresolved = new Set<string>();
  const edits: SourceEdit[] = [];

  // Walk the parsed AST (rather than regex-replacing the text) so only real
  // scalar values are rewritten — placeholders in comments stay untouched —
  // and so each rewritten scalar can be re-encoded safely via its source range.
  visit(parseDocument(source), {
    Scalar(_key, node) {
      if (typeof node.value !== 'string' || !node.range) {
        return;
      }
      const referenced = [...node.value.matchAll(INSTALL_PLACEHOLDER)].map((match) => match[1]);
      if (referenced.length === 0) {
        return;
      }

      for (const name of referenced) {
        if (!declared.has(name)) {
          undeclared.add(name);
        } else if (resolved[name] === undefined) {
          unresolved.add(name);
        }
      }
      if (referenced.some((name) => !declared.has(name) || resolved[name] === undefined)) {
        return;
      }

      const [start, valueEnd] = node.range;
      // A block scalar's source range includes the `|`/`>` header and the
      // trailing newline(s) before the next token, so a naive splice with a
      // re-encoded scalar would glue the next key onto the same line. Block
      // content is literal (no quoting/escaping), so substitute in place —
      // preserving the block style — unless a value itself contains a newline
      // (which could break the block indentation).
      const isBlock = node.type === 'BLOCK_LITERAL' || node.type === 'BLOCK_FOLDED';
      const segment = source.slice(start, valueEnd);
      if (isBlock && referenced.every((name) => !/[\r\n]/.test(String(resolved[name])))) {
        edits.push({
          start,
          end: valueEnd,
          text: segment.replace(INSTALL_PLACEHOLDER, (_match, name: string) =>
            String(resolved[name])
          ),
        });
        return;
      }
      // Whatever trailing layout the span includes (a block scalar's final
      // newline + indentation) must survive the re-encode.
      const trailing = /\s+$/.exec(segment)?.[0] ?? '';

      const exact = EXACT_INSTALL_PLACEHOLDER.exec(node.value);
      const replacement = exact
        ? resolved[exact[1]]
        : node.value.replace(INSTALL_PLACEHOLDER, (_match, name: string) => String(resolved[name]));
      const quoted = node.type === 'QUOTE_DOUBLE' || node.type === 'QUOTE_SINGLE';
      edits.push({
        start,
        end: valueEnd,
        text: encodeYamlScalar(replacement, { forceQuote: quoted }) + trailing,
      });
    },
  });

  if (undeclared.size > 0) {
    throw new MissingInstallFormFieldError([...undeclared].sort());
  }
  if (unresolved.size > 0) {
    throw new InstallFormValidationError(
      [...unresolved].sort().map((field) => ({
        field,
        reason: 'Referenced by the template body but no value was provided.',
      }))
    );
  }

  // Apply edits back-to-front so earlier offsets stay valid.
  return edits
    .sort((a, b) => b.start - a.start)
    .reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), source);
}

/**
 * Encode a resolved value as YAML scalar source text. Numbers and booleans are
 * emitted bare; strings are emitted bare only when that provably round-trips
 * (and is safe inside flow collections), otherwise double-quoted via
 * `JSON.stringify` (JSON string escaping is valid YAML).
 */
function encodeYamlScalar(value: unknown, { forceQuote = false } = {}): string {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  const text = String(value);
  return !forceQuote && isPlainSafe(text) ? text : JSON.stringify(text);
}

/** Chars that delimit flow collections — never safe in a bare scalar. */
const FLOW_UNSAFE = /[,[\]{}]/;

function isPlainSafe(text: string): boolean {
  if (text.length === 0 || text !== text.trim() || text.includes('\n') || FLOW_UNSAFE.test(text)) {
    return false;
  }
  try {
    // Bare-safe iff YAML parses the candidate back to the exact same string
    // (rules out numbers, booleans, null, mappings, comments, anchors, …).
    return parse(text) === text;
  } catch {
    return false;
  }
}
