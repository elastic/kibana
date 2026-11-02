/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ProposalTracker } from './proposal_tracker';
import type { ProposalRecord } from './proposal_tracker';

const createRecord = (id: string, opts: Partial<ProposalRecord> = {}): ProposalRecord => ({
  proposalId: id,
  status: 'pending',
  beforeYaml: 'before',
  afterYaml: 'after',
  toolId: 'test_tool',
  attachmentVersion: 1,
  ...opts,
});

describe('ProposalTracker', () => {
  let tracker: ProposalTracker;

  beforeEach(() => {
    tracker = new ProposalTracker();
  });

  describe('basic CRUD', () => {
    it('setRecord stores and getRecord retrieves a record', () => {
      const record = createRecord('p1');
      tracker.setRecord(record);
      expect(tracker.getRecord('p1')).toEqual(record);
    });

    it('getRecord returns undefined for unknown id', () => {
      expect(tracker.getRecord('nonexistent')).toBeUndefined();
    });

    it('getAllRecords returns all stored records', () => {
      tracker.setRecord(createRecord('p1'));
      tracker.setRecord(createRecord('p2'));
      const all = tracker.getAllRecords();
      expect(all).toHaveLength(2);
      expect(all.map((r) => r.proposalId)).toEqual(['p1', 'p2']);
    });
  });

  describe('updateStatus', () => {
    it('transitions pending to accepted', () => {
      tracker.setRecord(createRecord('p1'));
      tracker.updateStatus('p1', 'accepted');
      expect(tracker.getRecord('p1')?.status).toBe('accepted');
    });

    it('transitions pending to declined', () => {
      tracker.setRecord(createRecord('p1'));
      tracker.updateStatus('p1', 'declined');
      expect(tracker.getRecord('p1')?.status).toBe('declined');
    });

    it('does nothing for unknown proposalId', () => {
      tracker.updateStatus('nonexistent', 'accepted');
      expect(tracker.getAllRecords()).toHaveLength(0);
    });
  });

  describe('subscribe / unsubscribe', () => {
    it('notifies listeners on setRecord', () => {
      const listener = jest.fn();
      tracker.subscribe(listener);
      tracker.setRecord(createRecord('p1'));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('notifies listeners on updateStatus', () => {
      tracker.setRecord(createRecord('p1'));
      const listener = jest.fn();
      tracker.subscribe(listener);
      tracker.updateStatus('p1', 'accepted');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe stops notifications', () => {
      const listener = jest.fn();
      const unsub = tracker.subscribe(listener);
      tracker.setRecord(createRecord('p1'));
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      tracker.setRecord(createRecord('p2'));
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('areAllResolved', () => {
    it('returns true when no records exist', () => {
      expect(tracker.areAllResolved()).toBe(true);
    });

    it('returns false when pending records exist', () => {
      tracker.setRecord(createRecord('p1'));
      expect(tracker.areAllResolved()).toBe(false);
    });

    it('returns true when all records are accepted or declined', () => {
      tracker.setRecord(createRecord('p1'));
      tracker.setRecord(createRecord('p2'));
      tracker.updateStatus('p1', 'accepted');
      tracker.updateStatus('p2', 'declined');
      expect(tracker.areAllResolved()).toBe(true);
    });
  });

  describe('onAllResolved', () => {
    it('fires when last pending record resolves', () => {
      const cb = jest.fn();
      tracker.onAllResolved(cb);

      tracker.setRecord(createRecord('p1'));
      tracker.setRecord(createRecord('p2'));
      expect(cb).not.toHaveBeenCalled();

      tracker.updateStatus('p1', 'accepted');
      expect(cb).not.toHaveBeenCalled();

      tracker.updateStatus('p2', 'accepted');
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('does NOT fire if still pending', () => {
      const cb = jest.fn();
      tracker.onAllResolved(cb);

      tracker.setRecord(createRecord('p1'));
      tracker.setRecord(createRecord('p2'));
      tracker.updateStatus('p1', 'accepted');

      expect(cb).not.toHaveBeenCalled();
    });

    it('unsubscribe stops callback', () => {
      const cb = jest.fn();
      const unsub = tracker.onAllResolved(cb);
      unsub();

      tracker.setRecord(createRecord('p1'));
      tracker.updateStatus('p1', 'accepted');
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('clear / clearAll', () => {
    it('clear removes a specific record', () => {
      tracker.setRecord(createRecord('p1'));
      tracker.setRecord(createRecord('p2'));
      tracker.clear('p1');
      expect(tracker.getRecord('p1')).toBeUndefined();
      expect(tracker.getRecord('p2')).toBeDefined();
    });

    it('clearAll removes all records', () => {
      tracker.setRecord(createRecord('p1'));
      tracker.setRecord(createRecord('p2'));
      tracker.clearAll();
      expect(tracker.getAllRecords()).toHaveLength(0);
    });
  });

  describe('cascadeDecline', () => {
    it('declines all proposals at or after the declined version (v1->v2, v2->v3, v3->v4)', () => {
      tracker.setRecord(createRecord('p1', { attachmentVersion: 1 }));
      tracker.setRecord(createRecord('p2', { attachmentVersion: 2 }));
      tracker.setRecord(createRecord('p3', { attachmentVersion: 3 }));

      const cascaded = tracker.cascadeDecline('p1');

      expect(tracker.getRecord('p1')?.status).toBe('declined');
      expect(tracker.getRecord('p2')?.status).toBe('declined');
      expect(tracker.getRecord('p3')?.status).toBe('declined');
      expect(cascaded).toEqual(['p2', 'p3']);
    });

    it('only declines proposals at or after the declined version', () => {
      tracker.setRecord(createRecord('p1', { attachmentVersion: 1 }));
      tracker.setRecord(createRecord('p2', { attachmentVersion: 2 }));
      tracker.setRecord(createRecord('p3', { attachmentVersion: 3 }));

      const cascaded = tracker.cascadeDecline('p2');

      expect(tracker.getRecord('p1')?.status).toBe('pending');
      expect(tracker.getRecord('p2')?.status).toBe('declined');
      expect(tracker.getRecord('p3')?.status).toBe('declined');
      expect(cascaded).toEqual(['p3']);
    });

    it('fires onAllResolved if cascade resolves all remaining pending proposals', () => {
      const cb = jest.fn();
      tracker.onAllResolved(cb);

      tracker.setRecord(createRecord('p1', { attachmentVersion: 1 }));
      tracker.setRecord(createRecord('p2', { attachmentVersion: 2 }));
      tracker.setRecord(createRecord('p3', { attachmentVersion: 3 }));

      tracker.cascadeDecline('p1');
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('does not cascade to already-accepted proposals', () => {
      tracker.setRecord(createRecord('p1', { attachmentVersion: 1 }));
      tracker.setRecord(createRecord('p2', { attachmentVersion: 2 }));
      tracker.setRecord(createRecord('p3', { attachmentVersion: 3 }));

      tracker.updateStatus('p1', 'accepted');
      tracker.updateStatus('p2', 'accepted');
      tracker.updateStatus('p3', 'accepted');

      const cascaded = tracker.cascadeDecline('p1');
      // p1 gets declined (overwritten) but p2, p3 were already accepted — no cascade
      expect(cascaded).toEqual([]);
      expect(tracker.getRecord('p2')?.status).toBe('accepted');
      expect(tracker.getRecord('p3')?.status).toBe('accepted');
    });

    it('returns empty array for unknown proposalId', () => {
      expect(tracker.cascadeDecline('nonexistent')).toEqual([]);
    });

    it('partial cascade: accept first, decline second cascades to third only', () => {
      tracker.setRecord(createRecord('p1', { attachmentVersion: 1 }));
      tracker.setRecord(createRecord('p2', { attachmentVersion: 2 }));
      tracker.setRecord(createRecord('p3', { attachmentVersion: 3 }));

      tracker.updateStatus('p1', 'accepted');
      const cascaded = tracker.cascadeDecline('p2');

      expect(tracker.getRecord('p1')?.status).toBe('accepted');
      expect(tracker.getRecord('p2')?.status).toBe('declined');
      expect(tracker.getRecord('p3')?.status).toBe('declined');
      expect(cascaded).toEqual(['p3']);
    });
  });
});
