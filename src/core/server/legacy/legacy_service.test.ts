/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  setupLoggingMock,
  setupLoggingRotateMock,
  reconfigureLoggingMock,
} from './legacy_service.test.mocks';

import { BehaviorSubject } from 'rxjs';
import moment from 'moment';
import { REPO_ROOT } from '@kbn/dev-utils';

import { Config, Env, ObjectToConfigAdapter } from '../config';

import { getEnvOptions, configServiceMock } from '../config/mocks';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { LegacyService, LegacyServiceSetupDeps } from './legacy_service';

let coreId: symbol;
let env: Env;
let config$: BehaviorSubject<Config>;

let setupDeps: LegacyServiceSetupDeps;

const logger = loggingSystemMock.create();
let configService: ReturnType<typeof configServiceMock.create>;

beforeEach(() => {
  coreId = Symbol();
  env = Env.createDefault(REPO_ROOT, getEnvOptions());
  configService = configServiceMock.create();

  setupDeps = {
    http: httpServiceMock.createInternalSetupContract(),
  };

  config$ = new BehaviorSubject<Config>(
    new ObjectToConfigAdapter({
      elasticsearch: { hosts: ['http://127.0.0.1'] },
      server: { autoListen: true },
    })
  );

  configService.getConfig$.mockReturnValue(config$);
});

afterEach(() => {
  jest.clearAllMocks();
  setupLoggingMock.mockReset();
  setupLoggingRotateMock.mockReset();
  reconfigureLoggingMock.mockReset();
});

describe('#setup', () => {
  it('initializes legacy logging', async () => {
    const opsConfig = {
      interval: moment.duration(5, 'second'),
    };
    const opsConfig$ = new BehaviorSubject(opsConfig);

    const loggingConfig = {
      foo: 'bar',
    };
    const loggingConfig$ = new BehaviorSubject(loggingConfig);

    configService.atPath.mockImplementation((path) => {
      if (path === 'ops') {
        return opsConfig$;
      }
      if (path === 'logging') {
        return loggingConfig$;
      }
      return new BehaviorSubject({});
    });

    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });

    await legacyService.setup(setupDeps);

    expect(setupLoggingMock).toHaveBeenCalledTimes(1);
    expect(setupLoggingMock).toHaveBeenCalledWith(
      setupDeps.http.server,
      loggingConfig,
      opsConfig.interval.asMilliseconds()
    );

    expect(setupLoggingRotateMock).toHaveBeenCalledTimes(1);
    expect(setupLoggingRotateMock).toHaveBeenCalledWith(setupDeps.http.server, loggingConfig);
  });

  it('reloads the logging config when the config changes', async () => {
    const opsConfig = {
      interval: moment.duration(5, 'second'),
    };
    const opsConfig$ = new BehaviorSubject(opsConfig);

    const loggingConfig = {
      foo: 'bar',
    };
    const loggingConfig$ = new BehaviorSubject(loggingConfig);

    configService.atPath.mockImplementation((path) => {
      if (path === 'ops') {
        return opsConfig$;
      }
      if (path === 'logging') {
        return loggingConfig$;
      }
      return new BehaviorSubject({});
    });

    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });

    await legacyService.setup(setupDeps);

    expect(reconfigureLoggingMock).toHaveBeenCalledTimes(1);
    expect(reconfigureLoggingMock).toHaveBeenCalledWith(
      setupDeps.http.server,
      loggingConfig,
      opsConfig.interval.asMilliseconds()
    );

    loggingConfig$.next({
      foo: 'changed',
    });

    expect(reconfigureLoggingMock).toHaveBeenCalledTimes(2);
    expect(reconfigureLoggingMock).toHaveBeenCalledWith(
      setupDeps.http.server,
      { foo: 'changed' },
      opsConfig.interval.asMilliseconds()
    );
  });

  it('stops reloading logging config once the service is stopped', async () => {
    const opsConfig = {
      interval: moment.duration(5, 'second'),
    };
    const opsConfig$ = new BehaviorSubject(opsConfig);

    const loggingConfig = {
      foo: 'bar',
    };
    const loggingConfig$ = new BehaviorSubject(loggingConfig);

    configService.atPath.mockImplementation((path) => {
      if (path === 'ops') {
        return opsConfig$;
      }
      if (path === 'logging') {
        return loggingConfig$;
      }
      return new BehaviorSubject({});
    });

    const legacyService = new LegacyService({
      coreId,
      env,
      logger,
      configService: configService as any,
    });

    await legacyService.setup(setupDeps);

    expect(reconfigureLoggingMock).toHaveBeenCalledTimes(1);
    expect(reconfigureLoggingMock).toHaveBeenCalledWith(
      setupDeps.http.server,
      loggingConfig,
      opsConfig.interval.asMilliseconds()
    );

    await legacyService.stop();

    loggingConfig$.next({
      foo: 'changed',
    });

    expect(reconfigureLoggingMock).toHaveBeenCalledTimes(1);
  });
});
