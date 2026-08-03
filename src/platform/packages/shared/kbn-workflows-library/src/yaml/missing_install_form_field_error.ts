/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The template body references `__install__.<name>` fields that its
 * `install.form` does not declare. This is an authoring bug in the template:
 * the form is the single source of truth for install-time inputs, so
 * installing must fail rather than silently substituting a placeholder.
 */
export class MissingInstallFormFieldError extends Error {
  constructor(public readonly fields: string[]) {
    super(
      `The template body references install fields not declared in ` +
        `\`install.form\`: ${fields.join(', ')}.`
    );
    this.name = 'MissingInstallFormFieldError';
  }
}
