/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Borrowed from @kbn/workflows-library (PR #274505). Replace with an import once that package merges.

import { parse as parseYaml } from 'yaml';
import semver from 'semver';
import { z, ZodError } from '@kbn/zod/v4';
import type { SchemaIssue } from './validate_example';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const METADATA_KEY = 'template-metadata';

// ---------------------------------------------------------------------------
// Install form schema (from @kbn/workflows-library src/schemas/install_form.ts)
// ---------------------------------------------------------------------------

const InstallFormFieldTypeSchema = z.union([
  z.literal('text'),
  z.literal('textarea'),
  z.literal('connector'),
  z.literal('select'),
  z.literal('boolean'),
  z.literal('number'),
]);

const InstallFormFieldOptionSchema = z
  .object({
    value: z.string().min(1).max(1024),
    label: z.string().min(1).max(1024),
  })
  .strict();

const InstallFormFieldSchema = z
  .object({
    name: z.string().min(1).max(1024),
    label: z.string().min(1).max(1024).optional(),
    description: z.string().min(1).max(4096).optional(),
    inputType: InstallFormFieldTypeSchema,
    required: z.boolean().optional(),
    connectorType: z.string().min(1).max(256).optional(),
    options: z.array(InstallFormFieldOptionSchema).max(100).optional(),
    default: z.union([z.string().max(1024), z.number(), z.boolean()]).optional(),
  })
  .strict();

const InstallFormSchema = z
  .object({
    form: z.array(InstallFormFieldSchema).max(100),
  })
  .strict();

// ---------------------------------------------------------------------------
// Template metadata schema (from @kbn/workflows-library src/schemas/template.ts)
// ---------------------------------------------------------------------------

const semverString = z
  .string()
  .refine((value) => value.length <= 256 && semver.valid(value) !== null, {
    message: 'Must be a valid semver string (e.g. 1.0.0).',
  });

const semverRangeString = z
  .string()
  .refine((value) => value.length <= 256 && semver.validRange(value) !== null, {
    message: 'Must be a valid semver range (e.g. ">=9.5.0 <9.6.0").',
  });

export const TemplateMetadataSchema = z
  .object({
    slug: z
      .string()
      .max(1024)
      .regex(
        /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
        'Slug must be lowercase, alphanumeric, and dash-separated.'
      ),
    version: semverString,
    availability: semverRangeString,
    name: z.string().min(1).max(1024),
    description: z.string().min(1).max(4096),
    solutions: z.array(z.string().min(1).max(256)).max(10).optional(),
    categories: z.array(z.string().min(1).max(256)).min(1).max(100),
    install: InstallFormSchema.optional(),
  })
  .strict();

export type TemplateMetadata = z.infer<typeof TemplateMetadataSchema>;

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Returns true iff the YAML root contains a `template-metadata` key — regardless
 * of whether that block is valid.
 *
 * Returns false on any YAML parse error. Use `detectTemplateSafe` when the caller
 * also needs to surface syntax errors before mode-mismatch classification.
 */
export const detectTemplate = (yaml: string): boolean => {
  try {
    const doc = parseYaml(yaml);
    return doc !== null && typeof doc === 'object' && !Array.isArray(doc) && METADATA_KEY in doc;
  } catch {
    return false;
  }
};

/**
 * Like `detectTemplate`, but also surfaces any YAML parse error so the caller
 * can report `syntax-error` before mode-mismatch classification.
 */
export const detectTemplateSafe = (
  yaml: string
): { isTemplate: boolean; syntaxError: string | null } => {
  try {
    const doc = parseYaml(yaml);
    const isTemplate =
      doc !== null && typeof doc === 'object' && !Array.isArray(doc) && METADATA_KEY in doc;
    return { isTemplate, syntaxError: null };
  } catch (e) {
    return { isTemplate: false, syntaxError: (e as Error).message };
  }
};

// ---------------------------------------------------------------------------
// Metadata validation
// ---------------------------------------------------------------------------

/**
 * Validates the `template-metadata` block and returns any issues as `SchemaIssue[]`
 * with paths prefixed by `template-metadata.` so they appear alongside body issues.
 * Returns an empty array on success.
 */
export const validateTemplateMetadata = (yaml: string): SchemaIssue[] => {
  let doc: unknown;
  try {
    doc = parseYaml(yaml);
  } catch {
    // Caller should have caught YAML syntax errors first; return no issues here.
    return [];
  }

  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    return [{ path: METADATA_KEY, message: 'template-metadata block is missing or invalid.' }];
  }

  const root = doc as Record<string, unknown>;
  const metaRaw = root[METADATA_KEY];

  if (metaRaw === undefined || metaRaw === null) {
    return [{ path: METADATA_KEY, message: `Missing required \`${METADATA_KEY}\` block.` }];
  }

  const result = TemplateMetadataSchema.safeParse(metaRaw);
  if (result.success) {
    return [];
  }

  const { error } = result;
  if (!(error instanceof ZodError)) {
    return [{ path: METADATA_KEY, message: 'Template metadata is invalid.' }];
  }

  return error.issues.map((issue) => {
    const subPath = issue.path.map(String).join('.');
    const path = subPath ? `${METADATA_KEY}.${subPath}` : METADATA_KEY;
    return { path, message: issue.message };
  });
};
