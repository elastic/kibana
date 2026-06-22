/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The set of input widgets a template's install form can render. Each field's
 * `inputType` selects which renderer the install UI uses and which type-specific
 * properties on `InstallFormField` apply.
 */
export type InstallFormFieldType =
  | 'text'
  | 'textarea'
  | 'connector'
  | 'select'
  | 'boolean'
  | 'number';

export interface InstallFormFieldOption {
  value: string;
  label: string;
}

/**
 * A single install-time input declared by a template's `install.form` block.
 *
 * `name` is the identifier referenced from the workflow body via
 * `__install__.<name>` — the installer rewrites those references to the
 * submitted form values when persisting the workflow. Names are kebab-case by
 * convention (e.g. `abuseipdb-connector`); they never surface to end users.
 */
export interface InstallFormField {
  name: string;
  label?: string;
  description?: string;
  inputType: InstallFormFieldType;
  required?: boolean;
  /** Only meaningful when `inputType === 'connector'`. */
  connectorType?: string;
  /** Only meaningful when `inputType === 'select'`. */
  options?: InstallFormFieldOption[];
  default?: unknown;
}

export interface InstallFormSchema {
  form: InstallFormField[];
}
