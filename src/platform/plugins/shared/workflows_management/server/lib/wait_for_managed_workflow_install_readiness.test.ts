/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreStatus } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import { waitForManagedWorkflowInstallReadiness } from './wait_for_managed_workflow_install_readiness';

const makeCoreStatus = (
  elasticsearchLevel: (typeof ServiceStatusLevels)[keyof typeof ServiceStatusLevels]
): CoreStatus =>
  ({
    elasticsearch: { level: elasticsearchLevel, summary: 'test' },
    savedObjects: { level: ServiceStatusLevels.available, summary: 'test' },
  } as CoreStatus);

describe('waitForManagedWorkflowInstallReadiness', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ready when Elasticsearch is available and ping succeeds', async () => {
    const core$ = new BehaviorSubject(makeCoreStatus(ServiceStatusLevels.available));
    const esClient = { ping: jest.fn().mockResolvedValue(true) };

    await expect(
      waitForManagedWorkflowInstallReadiness({
        core$,
        esClient,
        signal: new AbortController().signal,
        logger,
      })
    ).resolves.toEqual({ ready: true });

    expect(esClient.ping).toHaveBeenCalled();
  });

  it('waits until Elasticsearch becomes available by default (no soft timeout)', async () => {
    const core$ = new BehaviorSubject(makeCoreStatus(ServiceStatusLevels.unavailable));
    const esClient = { ping: jest.fn().mockResolvedValue(true) };

    const readinessPromise = waitForManagedWorkflowInstallReadiness({
      core$,
      esClient,
      signal: new AbortController().signal,
      logger,
    });

    setTimeout(() => {
      core$.next(makeCoreStatus(ServiceStatusLevels.available));
    }, 20);

    await expect(readinessPromise).resolves.toEqual({ ready: true });
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('waiting for Elasticsearch to become available')
    );
  });

  it('returns not ready on timeout while Elasticsearch stays unavailable when timeoutMs is set', async () => {
    const core$ = new BehaviorSubject(makeCoreStatus(ServiceStatusLevels.unavailable));
    const esClient = { ping: jest.fn().mockResolvedValue(true) };

    await expect(
      waitForManagedWorkflowInstallReadiness({
        core$,
        esClient,
        signal: new AbortController().signal,
        timeoutMs: 50,
        logger,
      })
    ).resolves.toEqual({ ready: false, reason: 'timeout' });

    expect(esClient.ping).not.toHaveBeenCalled();
  });

  it('returns not ready immediately when already stopping', async () => {
    const core$ = new BehaviorSubject(makeCoreStatus(ServiceStatusLevels.available));
    const esClient = { ping: jest.fn().mockResolvedValue(true) };
    const stopController = new AbortController();
    stopController.abort();

    await expect(
      waitForManagedWorkflowInstallReadiness({
        core$,
        esClient,
        signal: stopController.signal,
        logger,
      })
    ).resolves.toEqual({ ready: false, reason: 'stopping' });

    expect(esClient.ping).not.toHaveBeenCalled();
  });

  it('returns not ready when stopping flips during the wait', async () => {
    const core$ = new BehaviorSubject(makeCoreStatus(ServiceStatusLevels.unavailable));
    const esClient = { ping: jest.fn().mockResolvedValue(true) };
    const stopController = new AbortController();

    const readinessPromise = waitForManagedWorkflowInstallReadiness({
      core$,
      esClient,
      signal: stopController.signal,
      timeoutMs: 1_000,
      logger,
    });

    setTimeout(() => {
      stopController.abort();
    }, 20);

    await expect(readinessPromise).resolves.toEqual({ ready: false, reason: 'stopping' });
    expect(esClient.ping).not.toHaveBeenCalled();
  });

  it('retries ping until it succeeds when timeoutMs is null', async () => {
    const core$ = new BehaviorSubject(makeCoreStatus(ServiceStatusLevels.available));
    const esClient = {
      ping: jest
        .fn()
        .mockRejectedValueOnce(new Error('NoLivingConnectionsError'))
        .mockResolvedValue(true),
    };

    await expect(
      waitForManagedWorkflowInstallReadiness({
        core$,
        esClient,
        signal: new AbortController().signal,
        pingRetryIntervalMs: 20,
        logger,
      })
    ).resolves.toEqual({ ready: true });

    expect(esClient.ping).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('waiting for Elasticsearch ping to succeed')
    );
  });

  it('returns not ready when ping keeps failing and soft timeoutMs is set', async () => {
    const core$ = new BehaviorSubject(makeCoreStatus(ServiceStatusLevels.available));
    const esClient = {
      ping: jest.fn().mockRejectedValue(new Error('NoLivingConnectionsError')),
    };

    await expect(
      waitForManagedWorkflowInstallReadiness({
        core$,
        esClient,
        signal: new AbortController().signal,
        timeoutMs: 1_000,
        logger,
      })
    ).resolves.toEqual({ ready: false, reason: 'elasticsearch_ping_failed' });

    expect(esClient.ping).toHaveBeenCalledTimes(1);
  });

  it('aborts ping retries when stopping flips', async () => {
    const core$ = new BehaviorSubject(makeCoreStatus(ServiceStatusLevels.available));
    const stopController = new AbortController();
    const esClient = {
      ping: jest.fn().mockImplementation(async () => {
        stopController.abort();
        throw new Error('NoLivingConnectionsError');
      }),
    };

    await expect(
      waitForManagedWorkflowInstallReadiness({
        core$,
        esClient,
        signal: stopController.signal,
        pingRetryIntervalMs: 500,
        logger,
      })
    ).resolves.toEqual({ ready: false, reason: 'stopping' });
  });
});
