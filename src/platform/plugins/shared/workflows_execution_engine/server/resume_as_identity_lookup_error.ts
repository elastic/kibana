/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Thrown when the identity of a resume run cannot be resolved, so Task Manager retries the run. */
export class ResumeAsIdentityLookupError extends Error {
  constructor() {
    super(
      'Could not resolve the identity of this resume run to compare it with the responder (resume-as: responder).'
    );
    this.name = 'ResumeAsIdentityLookupError';
  }
}
