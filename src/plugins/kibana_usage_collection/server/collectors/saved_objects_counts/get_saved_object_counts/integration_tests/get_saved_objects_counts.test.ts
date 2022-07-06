/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as kbnTestServer from '@kbn/core/test_helpers/kbn_server';
import { BUILT_IN_SO_TYPES } from '../get_saved_object_counts';

describe('SO type registrations', () => {
  let currentlyRegisteredTypes: string[];
  beforeAll(async () => {
    const root = kbnTestServer.createRoot({}, { oss: false });
    await root.preboot();
    const setup = await root.setup();
    currentlyRegisteredTypes = setup.savedObjects
      .getTypeRegistry()
      .getAllTypes()
      .map(({ name }) => name)
      .sort();
    await root.shutdown();
  });

  it('constant BUILT_IN_SO_TYPES is up-to-date with all the registered SO types', () => {
    expect(BUILT_IN_SO_TYPES.sort()).toEqual(currentlyRegisteredTypes);
  });
});
