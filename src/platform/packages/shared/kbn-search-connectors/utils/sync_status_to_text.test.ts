/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { syncStatusToColor, syncStatusToText } from './sync_status_to_text';
import { isSyncCancellable, SyncStatus } from '..';

describe('syncStatusToText', () => {
  it('should return correct value for completed', () => {
    expect(syncStatusToText(SyncStatus.COMPLETED)).toEqual('Sync complete');
  });
  it('should return correct value for error', () => {
    expect(syncStatusToText(SyncStatus.ERROR)).toEqual('Sync failure');
  });
  it('should return correct value for in progress', () => {
    expect(syncStatusToText(SyncStatus.IN_PROGRESS)).toEqual('Sync in progress');
  });
  it('should return correct value for canceling', () => {
    expect(syncStatusToText(SyncStatus.CANCELING)).toEqual('Canceling sync');
  });
  it('should return correct value for canceled', () => {
    expect(syncStatusToText(SyncStatus.CANCELED)).toEqual('Sync canceled');
  });
  it('should return correct value for pending', () => {
    expect(syncStatusToText(SyncStatus.PENDING)).toEqual('Sync pending');
  });
  it('should return correct value for suspended', () => {
    expect(syncStatusToText(SyncStatus.SUSPENDED)).toEqual('Sync suspended');
  });
});

describe('syncStatusToColor', () => {
  it('should return correct value for completed', () => {
    expect(syncStatusToColor(SyncStatus.COMPLETED)).toEqual('success');
  });
  it('should return correct value for error', () => {
    expect(syncStatusToColor(SyncStatus.ERROR)).toEqual('danger');
  });
  it('should return correct value for in progress', () => {
    expect(syncStatusToColor(SyncStatus.IN_PROGRESS)).toEqual('warning');
  });
  it('should return correct value for canceling', () => {
    expect(syncStatusToColor(SyncStatus.CANCELING)).toEqual('warning');
  });
  it('should return correct value for canceled', () => {
    expect(syncStatusToColor(SyncStatus.CANCELED)).toEqual('danger');
  });
  it('should return correct value for pending', () => {
    expect(syncStatusToColor(SyncStatus.PENDING)).toEqual('warning');
  });
  it('should return correct value for suspended', () => {
    expect(syncStatusToColor(SyncStatus.SUSPENDED)).toEqual('warning');
  });
});

describe('isSyncCancellable', () => {
  it('should return true for in progress status', () => {
    expect(isSyncCancellable(SyncStatus.IN_PROGRESS)).toBe(true);
  });

  it('should return true for pending status', () => {
    expect(isSyncCancellable(SyncStatus.PENDING)).toBe(true);
  });

  it('should return true for suspended status', () => {
    expect(isSyncCancellable(SyncStatus.SUSPENDED)).toBe(true);
  });

  it('should return false for canceling status', () => {
    expect(isSyncCancellable(SyncStatus.CANCELING)).toBe(false);
  });

  it('should return false for completed status', () => {
    expect(isSyncCancellable(SyncStatus.COMPLETED)).toBe(false);
  });

  it('should return false for error status', () => {
    expect(isSyncCancellable(SyncStatus.ERROR)).toBe(false);
  });

  it('should return false for canceled status', () => {
    expect(isSyncCancellable(SyncStatus.CANCELED)).toBe(false);
  });
});
