/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import { License } from '@kbn/licensing-plugin/common/license';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { ILicense } from '@kbn/licensing-types';
import { loggerMock } from '@kbn/logging-mocks';
import { AvailabilityUpdater, type AvailabilityUpdaterDeps } from './availability_updater';
import { isLicenseValid } from './is_license_valid';

const enterpriseLicense = () =>
  licenseMock.createLicense({
    license: { type: 'enterprise', mode: 'enterprise', status: 'active' },
  });

const basicLicense = () => licenseMock.createLicense();

const unavailableLicense = () =>
  new License({ error: 'Elasticsearch license API unavailable', signature: 'error-sig' });

const expiredEnterpriseLicense = () =>
  licenseMock.createLicense({
    license: { type: 'enterprise', mode: 'enterprise', status: 'expired' },
  });

async function flushAsync(): Promise<void> {
  await Promise.resolve();
}

const emptyDisableResult = () => ({
  total: 0,
  disabled: 0,
  failures: [] as Array<{ id: string; error: string }>,
});

describe('isLicenseValid', () => {
  it('returns true when active and at least enterprise', () => {
    expect(isLicenseValid(enterpriseLicense())).toBe(true);
  });

  it('returns false when below enterprise tier', () => {
    expect(isLicenseValid(basicLicense())).toBe(false);
  });

  it('returns false when license is not active (e.g. expired)', () => {
    expect(isLicenseValid(expiredEnterpriseLicense())).toBe(false);
  });
});

describe('AvailabilityUpdater', () => {
  let license$: Subject<ILicense>;
  let disableAllWorkflows: jest.Mock;
  let mockLogger: ReturnType<typeof loggerMock.create>;

  const baseConfig = {
    available: true,
    enabled: true,
    logging: { console: false },
  } as AvailabilityUpdaterDeps['config'];

  beforeEach(() => {
    license$ = new Subject<ILicense>();
    disableAllWorkflows = jest.fn().mockResolvedValue(emptyDisableResult());
    mockLogger = loggerMock.create();
  });

  afterEach(() => {
    license$.complete();
  });

  function createUpdater(partial: Partial<AvailabilityUpdaterDeps> = {}) {
    const deps: AvailabilityUpdaterDeps = {
      licensing: { license$: license$.asObservable() } as AvailabilityUpdaterDeps['licensing'],
      config: baseConfig,
      api: { disableAllWorkflows } as unknown as AvailabilityUpdaterDeps['api'],
      logger: mockLogger,
      ...partial,
    };
    return new AvailabilityUpdater(deps);
  }

  it('calls api.disableAllWorkflows once when config.available is false (constructor listen)', async () => {
    disableAllWorkflows.mockResolvedValue({ total: 3, disabled: 3, failures: [] });

    createUpdater({
      config: { ...baseConfig, available: false } as AvailabilityUpdaterDeps['config'],
    });

    await flushAsync();

    expect(disableAllWorkflows).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Workflows is not available. Disabled 3 active workflows'
    );
  });

  it('does not log info when config unavailable disable returns disabled count 0', async () => {
    disableAllWorkflows.mockResolvedValue({ total: 0, disabled: 0, failures: [] });

    createUpdater({
      config: { ...baseConfig, available: false } as AvailabilityUpdaterDeps['config'],
    });

    await flushAsync();

    expect(disableAllWorkflows).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('logs error when config unavailable disable returns failures', async () => {
    disableAllWorkflows.mockResolvedValue({
      total: 1,
      disabled: 0,
      failures: [{ id: 'wf-1', error: 'bulk failed' }],
    });

    createUpdater({
      config: { ...baseConfig, available: false } as AvailabilityUpdaterDeps['config'],
    });

    await flushAsync();

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Workflows is not available. Failed to disable 1 active workflows',
      { error: expect.any(Error) }
    );
    expect((mockLogger.error.mock.calls[0][1] as { error: Error }).error.message).toBe(
      'bulk failed'
    );
  });

  it('logs catch when config unavailable disable throws', async () => {
    disableAllWorkflows.mockRejectedValue(new Error('ES down'));

    createUpdater({
      config: { ...baseConfig, available: false } as AvailabilityUpdaterDeps['config'],
    });

    await flushAsync();

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to disable workflows on workflows not available',
      { error: expect.any(Error) }
    );
  });

  it('does not call disableAllWorkflows when config.available is true and no license emission yet', async () => {
    createUpdater();

    await flushAsync();

    expect(disableAllWorkflows).not.toHaveBeenCalled();
  });

  it('does not call disableAllWorkflows on consecutive valid (enterprise) license emissions', async () => {
    createUpdater();

    license$.next(enterpriseLicense());
    license$.next(
      licenseMock.createLicense({
        license: { type: 'enterprise', mode: 'enterprise', status: 'active' },
        signature: 'sig-2',
      })
    );
    await flushAsync();

    expect(disableAllWorkflows).not.toHaveBeenCalled();
  });

  it('calls disableAllWorkflows when license is available but no longer valid (downgrade)', async () => {
    disableAllWorkflows.mockResolvedValue({ total: 2, disabled: 2, failures: [] });

    createUpdater();

    license$.next(enterpriseLicense());
    await flushAsync();
    expect(disableAllWorkflows).not.toHaveBeenCalled();

    license$.next(basicLicense());
    await flushAsync();

    expect(disableAllWorkflows).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'License no longer supports Workflows (enterprise). Disabled 2 active workflows'
    );
  });

  it('logs error when license downgrade disable returns failures', async () => {
    disableAllWorkflows.mockResolvedValue({
      total: 2,
      disabled: 0,
      failures: [
        { id: 'wf-a', error: 'version conflict' },
        { id: 'wf-b', error: 'index closed' },
      ],
    });

    createUpdater();

    license$.next(enterpriseLicense());
    await flushAsync();
    license$.next(basicLicense());
    await flushAsync();

    expect(mockLogger.error).toHaveBeenCalledWith(
      'License no longer supports Workflows (enterprise). Failed to disable 2 active workflows',
      { error: expect.any(Error) }
    );
    expect((mockLogger.error.mock.calls[0][1] as { error: Error }).error.message).toBe(
      'version conflict, index closed'
    );
  });

  it('logs catch when license downgrade disable throws', async () => {
    disableAllWorkflows.mockRejectedValue(new Error('cluster unavailable'));

    createUpdater();

    license$.next(enterpriseLicense());
    await flushAsync();
    license$.next(basicLicense());
    await flushAsync();

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to disable workflows on license downgrade.',
      { error: expect.any(Error) }
    );
  });

  it('does not disable when isAvailable is false (transient / unknown license)', async () => {
    createUpdater();

    license$.next(unavailableLicense());
    await flushAsync();
    expect(disableAllWorkflows).not.toHaveBeenCalled();

    license$.next(unavailableLicense());
    await flushAsync();
    expect(disableAllWorkflows).not.toHaveBeenCalled();
  });

  it('disables once when license becomes available and invalid after unavailable emissions', async () => {
    disableAllWorkflows.mockResolvedValue({ total: 1, disabled: 1, failures: [] });

    createUpdater();

    license$.next(unavailableLicense());
    await flushAsync();
    license$.next(enterpriseLicense());
    await flushAsync();
    expect(disableAllWorkflows).not.toHaveBeenCalled();

    license$.next(basicLicense());
    await flushAsync();
    expect(disableAllWorkflows).toHaveBeenCalledTimes(1);

    license$.next(basicLicense());
    await flushAsync();
    expect(disableAllWorkflows).toHaveBeenCalledTimes(1);
  });

  it('disables when license is available but not active (e.g. expired enterprise)', async () => {
    disableAllWorkflows.mockResolvedValue({ total: 1, disabled: 1, failures: [] });

    createUpdater();

    license$.next(enterpriseLicense());
    await flushAsync();

    license$.next(expiredEnterpriseLicense());
    await flushAsync();

    expect(disableAllWorkflows).toHaveBeenCalledTimes(1);
  });

  it('does not call disableAllWorkflows again after stop (subscription ended)', async () => {
    disableAllWorkflows.mockResolvedValue({ total: 1, disabled: 1, failures: [] });

    createUpdater();

    license$.next(basicLicense());
    await flushAsync();
    expect(disableAllWorkflows).toHaveBeenCalledTimes(1);

    license$.next(enterpriseLicense());
    await flushAsync();
    expect(disableAllWorkflows).toHaveBeenCalledTimes(1);

    license$.next(basicLicense());
    await flushAsync();
    expect(disableAllWorkflows).toHaveBeenCalledTimes(1);
  });

  it('manual stop() prevents disable when later license becomes invalid', async () => {
    const updater = createUpdater();

    license$.next(enterpriseLicense());
    await flushAsync();
    updater.stop();

    license$.next(basicLicense());
    await flushAsync();

    expect(disableAllWorkflows).not.toHaveBeenCalled();
  });
});
