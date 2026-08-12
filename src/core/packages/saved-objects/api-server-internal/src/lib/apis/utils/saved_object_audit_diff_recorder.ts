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

export type WriteAuditAction =
  | 'saved_object_create'
  | 'saved_object_update'
  | 'saved_object_delete';

/**
 * Handle for recording audit facts about a single saved object's write as they
 * become known. All methods are cheap data recording — nothing is emitted until
 * the recorder is flushed.
 */
export interface WriteAuditRecord {
  /** Record the object's attributes before the mutation. */
  setBefore(attributes: Record<string, unknown>): void;
  /** Record the object's attributes after the mutation. */
  setAfter(attributes: Record<string, unknown>): void;
  /** Mark the object's write as committed; unflipped records audit as 'unknown'. */
  succeed(): void;
}

interface InternalRecord {
  savedObject: { type: string; id: string };
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  outcome: 'success' | 'unknown';
}

export interface SavedObjectAuditDiffRecorderConstructorParams {
  /** The mutation being audited. */
  action: WriteAuditAction;
  /** The security extension responsible for emitting the audit events. */
  securityExtension: ISavedObjectsSecurityExtension;
  /** The encryption extension used to determine which attributes to redact. */
  encryptionExtension: ISavedObjectsEncryptionExtension | undefined;
  /** Logger used to report (and swallow) emit failures so auditing never fails the operation. */
  logger: Logger;
}

/**
 * Collects per-object audit state for one saved object write operation (single or bulk)
 * and emits one audit event per tracked object when flushed.
 *
 * When saved object diff auditing is enabled, the pre-operation audit event is suppressed
 * at authorization time, so the flushed events are the operation's only audit record:
 * outcome 'success' with an attribute diff for objects whose ES write committed, outcome
 * 'unknown' (with the attempted change, as far as it was recorded) for objects whose
 * write was attempted but did not complete.
 *
 * The repository creates one recorder per operation — only when saved object diff
 * auditing is enabled, so a recorder's existence implies the feature is active — and
 * flushes it in a `finally`. The API implementations only record facts through
 * {@link track} handles and stay free of audit control flow.
 */
export class SavedObjectAuditDiffRecorder {
  private readonly action: WriteAuditAction;
  private readonly securityExtension: ISavedObjectsSecurityExtension;
  private readonly encryptionExtension: ISavedObjectsEncryptionExtension | undefined;
  private readonly logger: Logger;
  private readonly records = new Map<string, InternalRecord>();

  constructor({
    action,
    securityExtension,
    encryptionExtension,
    logger,
  }: SavedObjectAuditDiffRecorderConstructorParams) {
    this.action = action;
    this.securityExtension = securityExtension;
    this.encryptionExtension = encryptionExtension;
    this.logger = logger;
  }

  /**
   * Registers a saved object for auditing and returns a handle for recording its
   * before/after attributes and outcome. Re-tracking the same object (e.g. on a
   * conflict retry) replaces its previously recorded state, so the final attempt
   * determines what is audited.
   */
  track(
    savedObject: { type: string; id: string },
    initial: { before?: Record<string, unknown>; after?: Record<string, unknown> } = {}
  ): WriteAuditRecord {
    const record: InternalRecord = {
      savedObject,
      before: initial.before ?? {},
      after: initial.after ?? {},
      outcome: 'unknown',
    };
    this.records.set(`${savedObject.type}:${savedObject.id}`, record);

    return {
      setBefore: (attributes) => {
        record.before = attributes;
      },
      setAfter: (attributes) => {
        record.after = attributes;
      },
      succeed: () => {
        record.outcome = 'success';
      },
    };
  }

  /**
   * Emits one audit event per tracked object. Never throws — an audit problem must
   * not turn a (possibly committed) write into an API error. Flushing clears the
   * recorded state, so a second flush is a no-op.
   */
  flush(): void {
    for (const { savedObject, before, after, outcome } of this.records.values()) {
      try {
        // ESO attributes may appear here as ciphertext; forwarding them as
        // fieldsToRedact hides their values in the emitted diff.
        const encryptedAttributes = this.encryptionExtension?.getEncryptedAttributes(
          savedObject.type
        );
        this.securityExtension.emitSavedObjectDiffAuditEvent({
          action: this.action,
          savedObject,
          outcome,
          before,
          after,
          fieldsToRedact: encryptedAttributes ? [...encryptedAttributes] : undefined,
        });
      } catch (error) {
        // Use String(error) rather than error.message, which would throw if a
        // non-Error (e.g. null) was thrown.
        this.logger.error(
          `Failed to emit saved object write audit event for ${savedObject.type}:${
            savedObject.id
          }: ${String(error)}`
        );
      }
    }
    this.records.clear();
  }
}
