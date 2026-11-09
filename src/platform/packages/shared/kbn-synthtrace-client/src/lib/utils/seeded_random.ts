/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import seedrandom from 'seedrandom';

/**
 * A `Math.random` replacement that always returns the same sequence for the same seed, to make
 * generated data reproducible, e.g. by passing it as the `random` option of `edotBrowser.session()`.
 * Seeds of any length are fully used, so different seeds don't end up with the same sequence.
 */
export const createSeededRandom = (seed: string): (() => number) => seedrandom(seed);
