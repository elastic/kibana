/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type {
  ISavedObjectsSecurityExtension,
  ISavedObjectsEncryptionExtension,
} from '@kbn/core-saved-objects-server';

/**
 * The parameters for {@link emitSavedObjectDiffAuditEvent}.
 */
export interface EmitSavedObjectDiffAuditEventParams {
  /** The security extension responsible for emitting the audit event. */
  securityExtension: ISavedObjectsSecurityExtension | undefined;
  /** The encryption extension used to determine which attributes to redact. */
  encryptionExtension: ISavedObjectsEncryptionExtension | undefined;
  /** Logger used to report (and swallow) failures so audit emission never fails the write. */
  logger: Logger;
  /** The mutation being audited. */
  action: 'saved_object_create' | 'saved_object_update' | 'saved_object_delete';
  /** The saved object that was mutated. */
  savedObject: { type: string; id: string };
  /** The object's attributes before the mutation (`{}` for create). */
  before: Record<string, unknown>;
  /** The object's attributes after the mutation (`{}` for delete). */
  after: Record<string, unknown>;
}

/**
 * Emits a post-write audit event carrying an Extended JSON Patch diff of a saved
 * object's attributes. Called by the repository create/update/delete (and bulk)
 * APIs after a successful Elasticsearch write.
 *
 * This is a no-op unless a security extension is present and saved object diff auditing
 * is enabled, so the encryption lookup and diff computation are only paid for
 * when the feature is turned on.
 *
 * The ES write has already committed by the time this runs, so any failure while
 * computing or emitting the diff is caught and logged rather than propagated — an
 * audit-diff problem must never turn a successful write into an API error.
 *
 * Encrypted attributes (as reported by the encryption extension) are forwarded as
 * the redaction list so their values are never written to the audit log. Note
 * that at this point encrypted attributes are ciphertext; because ESO encryption
 * is non-deterministic, an encrypted attribute included in a write may surface as
 * a (redacted) change even when its plaintext is unchanged.
 */
export const emitSavedObjectDiffAuditEvent = ({
  securityExtension,
  encryptionExtension,
  logger,
  action,
  savedObject,
  before,
  after,
}: EmitSavedObjectDiffAuditEventParams): void => {
  if (!securityExtension?.savedObjectDiffEnabled) {
    return;
  }

  try {
    const encryptedAttributes = encryptionExtension?.getEncryptedAttributes(savedObject.type);
    const fieldsToRedact = encryptedAttributes ? [...encryptedAttributes] : undefined;

    securityExtension.emitAuditEvent({
      action,
      savedObject,
      outcome: 'success',
      before,
      after,
      fieldsToRedact,
    });
  } catch (error) {
    // This runs after the ES write has committed, so it must never throw. Use String(error)
    // rather than error.message, which would throw if a non-Error (e.g. null) was thrown.
    logger.error(
      `Failed to emit saved object diff audit event for ${savedObject.type}:${
        savedObject.id
      }: ${String(error)}`
    );
  }
};
