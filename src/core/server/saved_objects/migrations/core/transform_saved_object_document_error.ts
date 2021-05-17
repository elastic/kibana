/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Error thrown when saved object migrations encounter a transformation error.
 * Transformation errors happen when a transform function throws an error for an unsanitized saved object
 * The id (doc.id) reported in this error class is just the uuid part and doesn't tell users what the full elasticsearch id is.
 * in order to convert the id to the serialized version further upstream using serializer.generateRawId, we need to provide the following items:
 * - namespace: doc.namespace,
 * - type: doc.type,
 * - id: doc.id,
 * The new error class helps with v2 migrations.
 * For backward compatibility with v1 migrations, the error message is the same as what was previously thrown as a plain error
 */

export class TransformSavedObjectDocumentError extends Error {
  constructor(
    public readonly id: string,
    public readonly type: string,
    public readonly namespace: string | undefined,
    public readonly failedTransform: string, // created by document_migrator wrapWithTry as `${type.name}:${version}`;
    public readonly failedDoc: string,
    public readonly originalError: Error
  ) {
    super(`Failed to transform document ${id}. Transform: ${failedTransform}\nDoc: ${failedDoc}`);
  }
}
