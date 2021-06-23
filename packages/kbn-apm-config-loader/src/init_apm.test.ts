/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockLoadConfiguration } from './init_apm.test.mocks';

import { initApm } from './init_apm';
import apm from 'elastic-apm-node';

describe('initApm', () => {
  let apmAddFilterSpy: jest.SpyInstance;
  let apmStartSpy: jest.SpyInstance;
  let getConfig: jest.Mock;

  beforeEach(() => {
    apmAddFilterSpy = jest.spyOn(apm, 'addFilter').mockImplementation(() => undefined);
    apmStartSpy = jest.spyOn(apm, 'start').mockImplementation(() => undefined as any);
    getConfig = jest.fn();

    mockLoadConfiguration.mockImplementation(() => ({
      getConfig,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockLoadConfiguration.mockReset();
  });

  it('calls `loadConfiguration` with the correct options', () => {
    initApm(['foo', 'bar'], 'rootDir', true, 'service-name');

    expect(mockLoadConfiguration).toHaveBeenCalledTimes(1);
    expect(mockLoadConfiguration).toHaveBeenCalledWith(['foo', 'bar'], 'rootDir', true);
  });

  it('calls `apmConfigLoader.getConfig` with the correct options', () => {
    initApm(['foo', 'bar'], 'rootDir', true, 'service-name');

    expect(getConfig).toHaveBeenCalledTimes(1);
    expect(getConfig).toHaveBeenCalledWith('service-name');
  });

  it('registers a filter using `addFilter`', () => {
    initApm(['foo', 'bar'], 'rootDir', true, 'service-name');

    expect(apmAddFilterSpy).toHaveBeenCalledTimes(1);
    expect(apmAddFilterSpy).toHaveBeenCalledWith(expect.any(Function));
  });

  it('starts apm with the config returned from `getConfig`', () => {
    const config = {
      foo: 'bar',
    };
    getConfig.mockReturnValue(config);

    initApm(['foo', 'bar'], 'rootDir', true, 'service-name');

    expect(apmStartSpy).toHaveBeenCalledTimes(1);
    expect(apmStartSpy).toHaveBeenCalledWith(config);
  });
});
