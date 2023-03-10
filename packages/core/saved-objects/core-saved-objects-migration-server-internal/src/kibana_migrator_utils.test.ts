/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { indexMapToTypeIndexMap } from './kibana_migrator_utils';
import { INDEX_MAP_8_8_0 } from './kibana_migrator_utils.fixtures';
import { DEFAULT_TYPE_INDEX_MAP } from './kibana_migrator_constants';

describe('indexMapToTypeIndexMap', () => {
  it('converts IndexMap to TypeIndexMap', () => {
    expect(indexMapToTypeIndexMap(INDEX_MAP_8_8_0)).toEqual(DEFAULT_TYPE_INDEX_MAP);
  });
});
