/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFlameGraph } from './flamegraph';
import { baseFlamegraph } from './__fixtures__/base_flamegraph';

describe('Flamegraph', () => {
  const flamegraph = createFlameGraph(baseFlamegraph, false);

  it('base flamegraph has non-zero total seconds', () => {
    expect(baseFlamegraph.TotalSeconds).toEqual(4.980000019073486);
  });

  it('base flamegraph has one more node than the number of edges', () => {
    const numEdges = baseFlamegraph.Edges.flatMap((edge) => edge).length;

    expect(numEdges).toEqual(baseFlamegraph.Size - 1);
  });

  it('all flamegraph IDs are the same non-zero length', () => {
    // 16 is the length of a 64-bit FNV-1a hash encoded to a hex string
    const allSameLengthIDs = flamegraph.ID.every((id) => id.length === 16);

    expect(allSameLengthIDs).toBeTruthy();
  });

  it('all flamegraph labels are non-empty', () => {
    const allNonEmptyLabels = flamegraph.Label.every((id) => id.length > 0);

    expect(allNonEmptyLabels).toBeTruthy();
  });
});
