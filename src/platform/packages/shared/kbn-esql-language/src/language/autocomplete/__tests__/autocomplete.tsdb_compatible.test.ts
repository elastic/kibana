/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { FunctionDefinitionTypes } from '../../../commands/definitions/types';
import { Location } from '../../../commands/registry/types';
import { setTestFunctions } from '../../../commands/definitions/utils/test_functions';
import { setup } from './helpers';

const TS_INCOMPATIBLE_FN = {
  type: FunctionDefinitionTypes.AGG,
  name: 'TS_INCOMPATIBLE_AGG',
  description: 'An aggregation that is not supported in TS pipelines',
  signatures: [{ params: [], returnType: 'double' as const }],
  locationsAvailable: [Location.STATS],
  tsdbCompatible: false,
};

const TS_COMPATIBLE_FN = {
  type: FunctionDefinitionTypes.AGG,
  name: 'TS_COMPATIBLE_AGG',
  description: 'An aggregation that is supported everywhere',
  signatures: [{ params: [], returnType: 'double' as const }],
  locationsAvailable: [Location.STATS],
};

describe('tsdbCompatible filtering', () => {
  beforeEach(() => setTestFunctions([TS_INCOMPATIBLE_FN, TS_COMPATIBLE_FN]));
  afterEach(() => setTestFunctions([]));

  it('excludes tsdbCompatible:false functions from suggestions in a TS pipeline', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('TS index | STATS /')).map((s) => s.label);

    expect(suggestions).not.toContain('TS_INCOMPATIBLE_AGG');
    expect(suggestions).toContain('TS_COMPATIBLE_AGG');
  });

  it('includes tsdbCompatible:false functions in suggestions in a FROM pipeline', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM index | STATS /')).map((s) => s.label);

    expect(suggestions).toContain('TS_INCOMPATIBLE_AGG');
    expect(suggestions).toContain('TS_COMPATIBLE_AGG');
  });
});
