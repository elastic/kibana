/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { checkTargetMappings } from './check_target_mappings';
import { diffMappings } from '../core/build_active_mappings';

jest.mock('../core/build_active_mappings');

const diffMappingsMock = diffMappings as jest.MockedFn<typeof diffMappings>;

const sourceIndexMappings: IndexMapping = {
  properties: {
    field: { type: 'integer' },
  },
};

const targetIndexMappings: IndexMapping = {
  properties: {
    field: { type: 'long' },
  },
};

describe('checkTargetMappings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns match=false if source mappings are not defined', async () => {
    const task = checkTargetMappings({
      targetIndexMappings,
    });

    const result = await task();
    expect(diffMappings).not.toHaveBeenCalled();
    expect(result).toEqual(Either.right({ match: false }));
  });

  it('calls diffMappings() with the source and target mappings', async () => {
    const task = checkTargetMappings({
      sourceIndexMappings,
      targetIndexMappings,
    });

    await task();
    expect(diffMappings).toHaveBeenCalledTimes(1);
    expect(diffMappings).toHaveBeenCalledWith(sourceIndexMappings, targetIndexMappings);
  });

  it('returns match=true if diffMappings() match', async () => {
    diffMappingsMock.mockReturnValueOnce(undefined);

    const task = checkTargetMappings({
      sourceIndexMappings,
      targetIndexMappings,
    });

    const result = await task();
    expect(result).toEqual(Either.right({ match: true }));
  });

  it('returns match=false if diffMappings() finds differences', async () => {
    diffMappingsMock.mockReturnValueOnce({ changedProp: 'field' });

    const task = checkTargetMappings({
      sourceIndexMappings,
      targetIndexMappings,
    });

    const result = await task();
    expect(result).toEqual(Either.right({ match: false }));
  });
});
