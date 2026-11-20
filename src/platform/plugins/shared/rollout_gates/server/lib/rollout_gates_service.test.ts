/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { BuildIdentity } from './build_comparator';
import type { GateLedger } from './gate_ledger';
import { RolloutGatesService } from './rollout_gates_service';

const build = (num: number): BuildIdentity => ({ sha: `sha-${num}`, num, date: `date-${num}` });

const createLedgerMock = (): jest.Mocked<GateLedger> =>
  ({
    recordGenesis: jest.fn(),
    recordGate: jest.fn(),
  } as unknown as jest.Mocked<GateLedger>);

describe('RolloutGatesService', () => {
  describe('outside serverless or without a real build', () => {
    it('resolves every declared gate to finalized without touching the ledger', async () => {
      const ledger = createLedgerMock();
      const service = new RolloutGatesService({
        logger: loggerMock.create(),
        isServerless: false,
        isRealBuild: true,
        currentBuild: build(101),
        declaredGateIds: new Set(['x']),
        ledger,
      });

      service.start();

      await expect(service.getPhase('x')).resolves.toBe('finalized');
      expect(ledger.recordGenesis).not.toHaveBeenCalled();
      expect(ledger.recordGate).not.toHaveBeenCalled();
    });

    it('is a no-op when not running a real build, even on serverless', async () => {
      const ledger = createLedgerMock();
      const service = new RolloutGatesService({
        logger: loggerMock.create(),
        isServerless: true,
        isRealBuild: false,
        currentBuild: build(101),
        declaredGateIds: new Set(['x']),
        ledger,
      });

      service.start();

      await expect(service.getPhase('x')).resolves.toBe('finalized');
      expect(ledger.recordGenesis).not.toHaveBeenCalled();
    });
  });

  describe('on serverless with a real build', () => {
    it('records the genesis build once and reuses it for every declared gate', async () => {
      const ledger = createLedgerMock();
      ledger.recordGenesis.mockResolvedValue(build(100));
      ledger.recordGate.mockImplementation(async (gateId: string) =>
        gateId === 'staged-gate' ? build(101) : build(100)
      );

      const service = new RolloutGatesService({
        logger: loggerMock.create(),
        isServerless: true,
        isRealBuild: true,
        currentBuild: build(101),
        declaredGateIds: new Set(['staged-gate', 'genesis-gate']),
        ledger,
      });

      service.start();

      await expect(service.getPhase('staged-gate')).resolves.toBe('staged');
      await expect(service.getPhase('genesis-gate')).resolves.toBe('finalized');
      expect(ledger.recordGenesis).toHaveBeenCalledTimes(1);
    });

    it('exposes introducing and genesis builds via getDebugInfo', async () => {
      const ledger = createLedgerMock();
      ledger.recordGenesis.mockResolvedValue(build(100));
      ledger.recordGate.mockResolvedValue(build(101));

      const service = new RolloutGatesService({
        logger: loggerMock.create(),
        isServerless: true,
        isRealBuild: true,
        currentBuild: build(101),
        declaredGateIds: new Set(['x']),
        ledger,
      });

      service.start();

      await expect(service.getDebugInfo('x')).resolves.toEqual({
        gateId: 'x',
        phase: 'staged',
        currentBuild: build(101),
        introducingBuild: build(101),
        genesisBuild: build(100),
      });
    });
  });

  it('throws synchronously for an undeclared gate id', () => {
    const service = new RolloutGatesService({
      logger: loggerMock.create(),
      isServerless: true,
      isRealBuild: true,
      currentBuild: build(101),
      declaredGateIds: new Set(),
      ledger: createLedgerMock(),
    });

    service.start();

    expect(() => service.getPhase('never-declared')).toThrow(/never declared/);
  });
});
