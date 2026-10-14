/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const InstallFormFieldTypeSchema = z.enum([
  // Standard types (no type-specific properties):
  'text',
  'textarea',
  'select',
  'boolean',
  'number',
  // Special types:
  'connector', // Connector autocomplete
  'esIndex', // Elasticsearch index autocomplete
]);

export const InstallFormFieldOptionSchema = z
  .object({
    value: z.string().min(1).max(1024),
    label: z.string().min(1).max(1024),
  })
  .strict();

// Properties shared by every install-form field, regardless of `inputType`.
const baseInstallFormFields = {
  name: z.string().min(1).max(1024),
  label: z.string().min(1).max(1024).optional(),
  description: z.string().min(1).max(4096).optional(),
  required: z.boolean().optional(),
  default: z.union([z.string().max(1024), z.number(), z.boolean()]).optional(),
};

// `connector`: requires `connectorType`; `options` is not allowed.
const ConnectorInstallFormFieldSchema = z
  .object({
    ...baseInstallFormFields,
    inputType: z.literal('connector'),
    connectorType: z.string().min(1).max(256),
  })
  .strict();

// `select`: requires `options`; `connectorType` is not allowed.
const SelectInstallFormFieldSchema = z
  .object({
    ...baseInstallFormFields,
    inputType: z.literal('select'),
    options: z.array(InstallFormFieldOptionSchema).max(100),
  })
  .strict();

// Standard types: no type-specific properties.
const StandardInstallFormFieldSchema = z
  .object({
    ...baseInstallFormFields,
    inputType: z.enum(['text', 'textarea', 'boolean', 'number', 'esIndex']),
  })
  .strict();

/**
 * A single install-time input declared by a template's `install.form` block,
 * modeled as a discriminated union on `inputType` so type-specific properties
 * are required exactly where they apply and rejected elsewhere (each branch is
 * `.strict()`):
 *   - `connector` → `connectorType` is required; `options` is not allowed.
 *   - `select`    → `options` is required; `connectorType` is not allowed.
 *   - all others  → neither `connectorType` nor `options` is allowed.
 */
export const InstallFormFieldSchema = z.discriminatedUnion('inputType', [
  ConnectorInstallFormFieldSchema,
  SelectInstallFormFieldSchema,
  StandardInstallFormFieldSchema,
]);

export const InstallFormSchema = z
  .object({
    form: z.array(InstallFormFieldSchema).max(100),
  })
  .strict();

/**
 * Lenient ("tolerant reader") variant of {@link InstallFormSchema} used on the
 * runtime body-fetch path (see `parseTemplateYaml`'s `lenient` mode). It strips
 * unknown keys at every level — the `install` object, each form field, and each
 * option — because the top-level `TemplateMetadataSchema.strip()` is shallow and
 * would otherwise reject a newer publisher's nested `install` field, 503-ing a
 * template the catalog already lists. Value-level invariants (including the
 * per-`inputType` requirements above) are preserved: authoring / CI validates
 * with the strict schema, so published content already satisfies them.
 */
const InstallFormFieldLenientSchema = z.discriminatedUnion('inputType', [
  ConnectorInstallFormFieldSchema.strip(),
  SelectInstallFormFieldSchema.strip().extend({
    options: z.array(InstallFormFieldOptionSchema.strip()).max(100),
  }),
  StandardInstallFormFieldSchema.strip(),
]);

export const InstallFormLenientSchema = InstallFormSchema.strip().extend({
  form: z.array(InstallFormFieldLenientSchema).max(100),
});
