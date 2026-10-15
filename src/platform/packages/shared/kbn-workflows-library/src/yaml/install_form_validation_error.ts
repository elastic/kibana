/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** A single field-level install-form validation failure. */
export interface InstallFormFieldError {
  /** The `install.form` field name (`InstallFormField['name']`). */
  field: string;
  /** Human-readable reason the value was rejected. */
  reason: string;
}

/**
 * Submitted install-form values failed validation against the template's
 * declared `install.form`. Carries field-level details so the API can return
 * a 400 with per-field errors and the UI can highlight the offending rows.
 */
export class InstallFormValidationError extends Error {
  constructor(public readonly errors: InstallFormFieldError[]) {
    super(
      `Install form values are invalid: ${errors
        .map(({ field, reason }) => `${field}: ${reason}`)
        .join('; ')}`
    );
    this.name = 'InstallFormValidationError';
  }
}
