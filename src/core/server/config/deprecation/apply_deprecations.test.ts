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

import { applyDeprecations } from './apply_deprecations';
import { ConfigDeprecation, ConfigDeprecationWithContext } from './types';
import { configDeprecationFactory as deprecations } from './deprecation_factory';

const wrapHandler = (
  handler: ConfigDeprecation,
  path: string = ''
): ConfigDeprecationWithContext => ({
  deprecation: handler,
  path,
});

describe('applyDeprecations', () => {
  it('calls all deprecations handlers once', () => {
    const handlerA = jest.fn();
    const handlerB = jest.fn();
    const handlerC = jest.fn();
    applyDeprecations(
      {},
      [handlerA, handlerB, handlerC].map(h => wrapHandler(h))
    );
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);
    expect(handlerC).toHaveBeenCalledTimes(1);
  });

  it('calls handlers with correct arguments', () => {
    const logger = () => undefined;
    const initialConfig = { foo: 'bar', deprecated: 'deprecated' };
    const alteredConfig = { foo: 'bar' };

    const handlerA = jest.fn().mockReturnValue(alteredConfig);
    const handlerB = jest.fn().mockImplementation(conf => conf);

    applyDeprecations(
      initialConfig,
      [wrapHandler(handlerA, 'pathA'), wrapHandler(handlerB, 'pathB')],
      logger
    );

    expect(handlerA).toHaveBeenCalledWith(initialConfig, 'pathA', logger);
    expect(handlerB).toHaveBeenCalledWith(alteredConfig, 'pathB', logger);
  });

  it('returns the migrated config', () => {
    const initialConfig = { foo: 'bar', deprecated: 'deprecated', renamed: 'renamed' };

    const migrated = applyDeprecations(initialConfig, [
      wrapHandler(deprecations.unused('deprecated')),
      wrapHandler(deprecations.rename('renamed', 'newname')),
    ]);

    expect(migrated).toEqual({ foo: 'bar', newname: 'renamed' });
  });

  it('does not alter the initial config', () => {
    const initialConfig = { foo: 'bar', deprecated: 'deprecated' };

    const migrated = applyDeprecations(initialConfig, [
      wrapHandler(deprecations.unused('deprecated')),
    ]);

    expect(initialConfig).toEqual({ foo: 'bar', deprecated: 'deprecated' });
    expect(migrated).toEqual({ foo: 'bar' });
  });
});
