/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { convertLegacyDeprecationProvider } from './legacy_deprecation_adapters';
import { LegacyConfigDeprecationProvider } from './types';
import { ConfigDeprecation } from '../../config';
import { configDeprecationFactory } from '../../config/deprecation/deprecation_factory';
import { applyDeprecations } from '../../config/deprecation/apply_deprecations';

jest.spyOn(configDeprecationFactory, 'unusedFromRoot');
jest.spyOn(configDeprecationFactory, 'renameFromRoot');

const executeHandlers = (handlers: ConfigDeprecation[]) => {
  handlers.forEach(handler => {
    handler({}, '', () => null);
  });
};

describe('convertLegacyDeprecationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the same number of handlers', async () => {
    const legacyProvider: LegacyConfigDeprecationProvider = ({ rename, unused }) => [
      rename('a', 'b'),
      unused('c'),
      unused('d'),
    ];

    const migrated = await convertLegacyDeprecationProvider(legacyProvider);
    const handlers = migrated(configDeprecationFactory);
    expect(handlers).toHaveLength(3);
  });

  it('invokes the factory "unusedFromRoot" when using legacy "unused"', async () => {
    const legacyProvider: LegacyConfigDeprecationProvider = ({ rename, unused }) => [
      rename('a', 'b'),
      unused('c'),
      unused('d'),
    ];

    const migrated = await convertLegacyDeprecationProvider(legacyProvider);
    const handlers = migrated(configDeprecationFactory);
    executeHandlers(handlers);

    expect(configDeprecationFactory.unusedFromRoot).toHaveBeenCalledTimes(2);
    expect(configDeprecationFactory.unusedFromRoot).toHaveBeenCalledWith('c');
    expect(configDeprecationFactory.unusedFromRoot).toHaveBeenCalledWith('d');
  });

  it('invokes the factory "renameFromRoot" when using legacy "rename"', async () => {
    const legacyProvider: LegacyConfigDeprecationProvider = ({ rename, unused }) => [
      rename('a', 'b'),
      unused('c'),
      rename('d', 'e'),
    ];

    const migrated = await convertLegacyDeprecationProvider(legacyProvider);
    const handlers = migrated(configDeprecationFactory);
    executeHandlers(handlers);

    expect(configDeprecationFactory.renameFromRoot).toHaveBeenCalledTimes(2);
    expect(configDeprecationFactory.renameFromRoot).toHaveBeenCalledWith('a', 'b');
    expect(configDeprecationFactory.renameFromRoot).toHaveBeenCalledWith('d', 'e');
  });

  it('properly works in a real use case', async () => {
    const legacyProvider: LegacyConfigDeprecationProvider = ({ rename, unused }) => [
      rename('old', 'new'),
      unused('unused'),
      unused('notpresent'),
    ];

    const convertedProvider = await convertLegacyDeprecationProvider(legacyProvider);
    const handlers = convertedProvider(configDeprecationFactory);

    const rawConfig = {
      old: 'oldvalue',
      unused: 'unused',
      goodValue: 'good',
    };

    const migrated = applyDeprecations(
      rawConfig,
      handlers.map(handler => ({ deprecation: handler, path: '' }))
    );
    expect(migrated).toEqual({ new: 'oldvalue', goodValue: 'good' });
  });
});
