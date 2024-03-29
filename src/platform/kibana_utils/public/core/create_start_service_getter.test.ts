/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StartServicesAccessor } from '@kbn/core/public';
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
    await new Promise((r) => process.nextTick(r)); // Allow the current loop of the event loop to run to completion

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
    await new Promise((r) => process.nextTick(r)); // Allow the current loop of the event loop to run to completion

    expect(start()).toEqual({
      core,
      plugins,
      self,
    });
  });
});
