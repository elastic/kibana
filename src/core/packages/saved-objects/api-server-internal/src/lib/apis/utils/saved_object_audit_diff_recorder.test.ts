/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type {
  ISavedObjectsSecurityExtension,
  ISavedObjectsEncryptionExtension,
} from '@kbn/core-saved-objects-server';
import { SavedObjectAuditDiffRecorder } from './saved_object_audit_diff_recorder';

describe('SavedObjectAuditDiffRecorder', () => {
  let logger: ReturnType<typeof loggerMock.create>;
  let emitSavedObjectDiffAuditEvent: jest.Mock;
  let securityExtension: ISavedObjectsSecurityExtension;
  let encryptionExtension: ISavedObjectsEncryptionExtension;

  const setup = () => {
    logger = loggerMock.create();
    emitSavedObjectDiffAuditEvent = jest.fn();
    securityExtension = {
      emitSavedObjectDiffAuditEvent,
      shouldComputeSavedObjectDiff: jest.fn().mockReturnValue(true),
    } as unknown as ISavedObjectsSecurityExtension;
    encryptionExtension = {
      getEncryptedAttributes: jest.fn().mockReturnValue(undefined),
    } as unknown as ISavedObjectsEncryptionExtension;

    return new SavedObjectAuditDiffRecorder({
      action: 'saved_object_create',
      securityExtension,
      encryptionExtension,
      logger,
    });
  };

  it('shouldComputeDiff delegates to the security extension allow list', () => {
    const recorder = setup();
    (securityExtension.shouldComputeSavedObjectDiff as jest.Mock).mockReturnValueOnce(false);

    expect(recorder.shouldComputeDiff('dashboard')).toBe(false);
    expect(securityExtension.shouldComputeSavedObjectDiff).toHaveBeenCalledWith('dashboard');
  });

  it('emits an unknown-outcome event with empty attributes for a tracked object by default', () => {
    const recorder = setup();
    recorder.track({ type: 'dashboard', id: '1' });
    recorder.flush();

    expect(emitSavedObjectDiffAuditEvent).toHaveBeenCalledTimes(1);
    expect(emitSavedObjectDiffAuditEvent).toHaveBeenCalledWith({
      action: 'saved_object_create',
      savedObject: { type: 'dashboard', id: '1' },
      outcome: 'unknown',
      before: {},
      after: {},
      attributesToRedact: undefined,
    });
  });

  it('emits a success event with the recorded before/after attributes', () => {
    const recorder = setup();
    const record = recorder.track({ type: 'dashboard', id: '1' });
    record.setBefore({ title: 'old' });
    record.setAfter({ title: 'new' });
    record.succeed();
    recorder.flush();

    expect(emitSavedObjectDiffAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'success',
        before: { title: 'old' },
        after: { title: 'new' },
      })
    );
  });

  it('forwards the encryption extension attributes as attributesToRedact', () => {
    const recorder = setup();
    (encryptionExtension.getEncryptedAttributes as jest.Mock).mockReturnValue(new Set(['secrets']));
    recorder.track({ type: 'connector', id: '1' }).setAfter({ secrets: 'x' });
    recorder.flush();

    expect(emitSavedObjectDiffAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ attributesToRedact: ['secrets'] })
    );
  });

  it('re-tracking the same object replaces its recorded state', () => {
    const recorder = setup();
    const first = recorder.track({ type: 'dashboard', id: '1' });
    first.setAfter({ title: 'a' });
    first.succeed();
    recorder.track({ type: 'dashboard', id: '1' }).setAfter({ title: 'b' });
    recorder.flush();

    expect(emitSavedObjectDiffAuditEvent).toHaveBeenCalledTimes(1);
    expect(emitSavedObjectDiffAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'unknown', after: { title: 'b' } })
    );
  });

  it('emits one event per tracked object', () => {
    const recorder = setup();
    recorder.track({ type: 'dashboard', id: '1' }).succeed();
    recorder.track({ type: 'dashboard', id: '2' });
    recorder.flush();

    expect(emitSavedObjectDiffAuditEvent).toHaveBeenCalledTimes(2);
  });

  it('keeps separate records for the same object tracked under different keys', () => {
    const recorder = setup();
    recorder.track({ type: 'dashboard', id: '1' }, { key: '0' }).succeed();
    recorder.track({ type: 'dashboard', id: '1' }, { key: '1' }).setAfter({ title: 'stale' });
    recorder.flush();

    expect(emitSavedObjectDiffAuditEvent).toHaveBeenCalledTimes(2);
    expect(emitSavedObjectDiffAuditEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ outcome: 'success', after: {} })
    );
    expect(emitSavedObjectDiffAuditEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ outcome: 'unknown', after: { title: 'stale' } })
    );
  });

  it('forwards the tracked name to the emitted event', () => {
    const recorder = setup();
    recorder.track({ type: 'dashboard', id: '1', name: 'My Dashboard' });
    recorder.flush();

    expect(emitSavedObjectDiffAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        savedObject: { type: 'dashboard', id: '1', name: 'My Dashboard' },
      })
    );
  });

  it('swallows and logs emit failures without affecting other records', () => {
    const recorder = setup();
    emitSavedObjectDiffAuditEvent.mockImplementationOnce(() => {
      throw new Error('audit boom');
    });
    recorder.track({ type: 'dashboard', id: '1' });
    recorder.track({ type: 'dashboard', id: '2' });

    expect(() => recorder.flush()).not.toThrow();
    expect(emitSavedObjectDiffAuditEvent).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when flushed a second time', () => {
    const recorder = setup();
    recorder.track({ type: 'dashboard', id: '1' });
    recorder.flush();
    recorder.flush();

    expect(emitSavedObjectDiffAuditEvent).toHaveBeenCalledTimes(1);
  });
});
