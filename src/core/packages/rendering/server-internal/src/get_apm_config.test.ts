/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getConfigurationMock,
  agentMock,
  shouldInstrumentClientMock,
} from './get_apm_config.test.mocks';
import { getApmConfig } from './get_apm_config';

const defaultApmConfig = {
  active: true,
  someConfigProp: 'value',
};

describe('getApmConfig', () => {
  beforeEach(() => {
    getConfigurationMock.mockReturnValue(defaultApmConfig);
    shouldInstrumentClientMock.mockReturnValue(true);
  });

  afterEach(() => {
    getConfigurationMock.mockReset();
    agentMock.currentTransaction = null;
  });

  it('returns null if apm is disabled', () => {
    shouldInstrumentClientMock.mockReturnValue(false);
    expect(getApmConfig('/path')).toBeNull();
  });

  it('calls `getConfig` with the correct parameters', () => {
    getApmConfig('/path');

    expect(getConfigurationMock).toHaveBeenCalledWith('kibana-frontend');
  });

  it('returns the configuration from the `getConfig` call', () => {
    const config = getApmConfig('/path');

    expect(config).toEqual(expect.objectContaining(defaultApmConfig));
  });

  it('returns the requestPath as `pageLoadTransactionName`', () => {
    const config = getApmConfig('/some-other-path');

    expect(config).toEqual(
      expect.objectContaining({
        pageLoadTransactionName: '/some-other-path',
      })
    );
  });

  it('omits secret token', () => {
    getConfigurationMock.mockReturnValue({
      ...defaultApmConfig,
      secretToken: 'smurfs',
    });
    const config = getApmConfig('/some-other-path');

    expect(config).not.toHaveProperty('secretToken');
  });

  it('omits apiKey', () => {
    getConfigurationMock.mockReturnValue({
      ...defaultApmConfig,
      apiKey: 'smurfs',
    });
    const config = getApmConfig('/some-other-path');

    expect(config).not.toHaveProperty('apiKey');
  });

  it('enhance the configuration with values from the current server-side transaction', () => {
    agentMock.currentTransaction = {
      sampled: 'sampled',
      traceId: 'traceId',
      ids: {
        ['transaction.id']: 'transactionId',
      },
    } as any;

    const config = getApmConfig('/some-other-path');

    expect(config).toEqual(
      expect.objectContaining({
        pageLoadTraceId: 'traceId',
        pageLoadSampled: 'sampled',
        pageLoadParentId: 'transactionId',
      })
    );
  });
});
