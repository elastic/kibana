/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function createSamplerAgg({
  type = 'random_sampler',
  probability,
  seed,
}: {
  type?: string;
  probability: number;
  seed?: number;
}) {
  return {
    [type]: {
      probability,
      seed,
    },
    aggs: {},
  };
}

export function isSamplingEnabled(probability: number | undefined) {
  return probability != null && probability !== 1;
}
