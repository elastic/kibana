/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('node:crypto', () => {
  return {
    getCiphers: jest.fn(() => []),
  };
});

import crypto from 'node:crypto';
import type { GetDeprecationsContext } from '@kbn/core-deprecations-server';
import { mockDeprecationsFactory, mockDeprecationsRegistry } from '../mocks';
import { registerNodeJsDeprecationsInfo } from './node_js_deprecations';

describe('#registerNodeJsDeprecationsInfo', () => {
  const deprecationsFactory = mockDeprecationsFactory.create();
  const deprecationsRegistry = mockDeprecationsRegistry.create();

  beforeEach(() => {
    jest.resetAllMocks();
    deprecationsFactory.getRegistry.mockReturnValue(deprecationsRegistry);
  });

  it('registers NodeJS deprecations when running legacy provider', () => {
    (crypto.getCiphers as jest.Mock).mockReturnValue([
      'blowfish' /* this cipher is part of legacy SSL provider */,
      'flyfish',
    ]);

    registerNodeJsDeprecationsInfo({ deprecationsFactory });

    expect(deprecationsFactory.getRegistry).toHaveBeenCalledTimes(1);
    expect(deprecationsFactory.getRegistry).toHaveBeenCalledWith('core.node_js_deprecations');

    expect(deprecationsRegistry.registerDeprecations).toHaveBeenCalledTimes(1);
    expect(deprecationsRegistry.registerDeprecations).toHaveBeenCalledWith({
      getDeprecations: expect.any(Function),
    });

    const [[{ getDeprecations }]] = deprecationsRegistry.registerDeprecations.mock.calls;
    const deprecations = getDeprecations({} as unknown as GetDeprecationsContext);
    expect(deprecations).toEqual([
      expect.objectContaining({
        deprecationType: 'feature',
        level: 'warning',
        title: expect.stringMatching(/Detected legacy OpenSSL/),
      }),
    ]);
  });

  it('does not register NodeJS deprecations if not running legacy provider', () => {
    (crypto.getCiphers as jest.Mock).mockReturnValue(['foo', 'bar']);

    registerNodeJsDeprecationsInfo({ deprecationsFactory });

    expect(deprecationsFactory.getRegistry).toHaveBeenCalledTimes(0);
    expect(deprecationsRegistry.registerDeprecations).toHaveBeenCalledTimes(0);
  });
});
