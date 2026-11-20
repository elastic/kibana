/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { BuildIdentity } from './build_comparator';
import { GateLedger } from './gate_ledger';
import { ROLLOUT_GATE_SO_TYPE } from './constants';
import type { RolloutGateAttributes } from '../saved_objects/schemas/rollout_gate';

const build = (num: number): BuildIdentity => ({ sha: `sha-${num}`, num, date: `date-${num}` });

const attributesFor = (gateId: string, build_: BuildIdentity): RolloutGateAttributes => ({
  gateId,
  buildSha: build_.sha,
  buildNum: build_.num,
  buildDate: build_.date,
  recordedAt: '2024-01-01T00:00:00.000Z',
});

describe('GateLedger', () => {
  let repository: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let ledger: GateLedger;

  beforeEach(() => {
    repository = savedObjectsRepositoryMock.create();
    ledger = new GateLedger({ repository, logger: loggerMock.create() });
  });

  describe('recordGate', () => {
    it('creates the record and returns the build when none exists yet', async () => {
      repository.create.mockResolvedValueOnce({
        type: ROLLOUT_GATE_SO_TYPE,
        id: 'gate:x',
        attributes: attributesFor('x', build(101)),
        references: [],
      });

      const result = await ledger.recordGate('x', build(101));

      expect(result).toEqual(build(101));
      expect(repository.create).toHaveBeenCalledWith(
        ROLLOUT_GATE_SO_TYPE,
        expect.objectContaining({ gateId: 'x', buildNum: 101 }),
        expect.objectContaining({ id: 'gate:x', refresh: false })
      );
      expect(repository.get).not.toHaveBeenCalled();
    });

    it('leaves the existing record untouched when it is already older or equal', async () => {
      repository.create.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(ROLLOUT_GATE_SO_TYPE, 'gate:x')
      );
      repository.get.mockResolvedValueOnce({
        type: ROLLOUT_GATE_SO_TYPE,
        id: 'gate:x',
        attributes: attributesFor('x', build(101)),
        references: [],
        version: 'v1',
      });

      const result = await ledger.recordGate('x', build(102));

      expect(result).toEqual(build(101));
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('lowers the record when the new build is older than the existing one', async () => {
      repository.create.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(ROLLOUT_GATE_SO_TYPE, 'gate:x')
      );
      repository.get.mockResolvedValueOnce({
        type: ROLLOUT_GATE_SO_TYPE,
        id: 'gate:x',
        attributes: attributesFor('x', build(101)),
        references: [],
        version: 'v1',
      });
      repository.update.mockResolvedValueOnce({
        type: ROLLOUT_GATE_SO_TYPE,
        id: 'gate:x',
        attributes: attributesFor('x', build(100)),
        references: [],
      });

      const result = await ledger.recordGate('x', build(100));

      expect(result).toEqual(build(100));
      expect(repository.update).toHaveBeenCalledWith(
        ROLLOUT_GATE_SO_TYPE,
        'gate:x',
        expect.objectContaining({ buildNum: 100 }),
        expect.objectContaining({ version: 'v1', refresh: false })
      );
    });

    it('retries the lower-if-older update on a version conflict, converging on the minimum', async () => {
      repository.create.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(ROLLOUT_GATE_SO_TYPE, 'gate:x')
      );
      // First read: another node has not raced us yet.
      repository.get.mockResolvedValueOnce({
        type: ROLLOUT_GATE_SO_TYPE,
        id: 'gate:x',
        attributes: attributesFor('x', build(101)),
        references: [],
        version: 'v1',
      });
      // The update loses a race with another node's write.
      repository.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(ROLLOUT_GATE_SO_TYPE, 'gate:x')
      );
      // Second read: the other node already lowered it further than ours.
      repository.get.mockResolvedValueOnce({
        type: ROLLOUT_GATE_SO_TYPE,
        id: 'gate:x',
        attributes: attributesFor('x', build(99)),
        references: [],
        version: 'v2',
      });

      const result = await ledger.recordGate('x', build(100));

      expect(result).toEqual(build(99));
      expect(repository.update).toHaveBeenCalledTimes(1);
      expect(repository.get).toHaveBeenCalledTimes(2);
    });

    it('rethrows errors that are not a create conflict', async () => {
      const error = new Error('cluster_block_exception');
      repository.create.mockRejectedValueOnce(error);

      await expect(ledger.recordGate('x', build(101))).rejects.toThrow(error);
      expect(repository.get).not.toHaveBeenCalled();
    });
  });

  describe('recordGenesis', () => {
    it('creates the genesis record at the fixed id with the reserved label', async () => {
      repository.create.mockResolvedValueOnce({
        type: ROLLOUT_GATE_SO_TYPE,
        id: 'genesis',
        attributes: attributesFor('__genesis__', build(100)),
        references: [],
      });

      const result = await ledger.recordGenesis(build(100));

      expect(result).toEqual(build(100));
      expect(repository.create).toHaveBeenCalledWith(
        ROLLOUT_GATE_SO_TYPE,
        expect.objectContaining({ gateId: '__genesis__' }),
        expect.objectContaining({ id: 'genesis' })
      );
    });
  });
});
