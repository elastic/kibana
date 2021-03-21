/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const mockPackage = new Proxy({ raw: {} as any }, { get: (obj, prop) => obj.raw[prop] });
import type { ConfigDeprecationWithContext, ConfigDeprecationHook } from './deprecation/types';

jest.mock('../../../package.json', () => mockPackage);

export const mockApplyDeprecations = jest.fn<
  Record<string, any>,
  [Record<string, any>, ConfigDeprecationWithContext[], (pluginId: string) => ConfigDeprecationHook]
>((config, deprecations, deprecationFactory) => config);

jest.mock('./deprecation/apply_deprecations', () => ({
  applyDeprecations: mockApplyDeprecations,
}));
