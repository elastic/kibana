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

import { StartServicesAccessor } from '../../../../core/public';
import { createStartServicesGetter } from './create_start_service_getter';
import { Defer } from '../../common/defer';

describe('createStartServicesGetter', () => {
  test('throws if services are accessed before accessor resolves', async () => {
    const future = new Defer<any>();
    const accessor: StartServicesAccessor = async () => await future.promise;
    const start = createStartServicesGetter(accessor);

    await new Promise((r) => setTimeout(r, 1));

    expect(() => start()).toThrowErrorMatchingInlineSnapshot(
      `"Trying to access start services before start."`
    );
  });

  test('returns services after accessor resolves even if first time called before it resolved', async () => {
    const future = new Defer<any>();
    const core = {};
    const plugins = {};
    const self = {};
    const accessor: StartServicesAccessor = async () => await future.promise;
    const start = createStartServicesGetter(accessor);

    await new Promise((r) => setTimeout(r, 1));

    expect(() => start()).toThrow();

    await new Promise((r) => setTimeout(r, 1));
    future.resolve([core, plugins, self]);
    await future.promise;

    expect(start()).toEqual({
      core,
      plugins,
      self,
    });
  });

  test('returns services if called after accessor resolves', async () => {
    const future = new Defer<any>();
    const core = {};
    const plugins = {};
    const self = {};
    const accessor: StartServicesAccessor = async () => await future.promise;
    const start = createStartServicesGetter(accessor);

    await new Promise((r) => setTimeout(r, 1));
    future.resolve([core, plugins, self]);
    await future.promise;

    expect(start()).toEqual({
      core,
      plugins,
      self,
    });
  });
});
