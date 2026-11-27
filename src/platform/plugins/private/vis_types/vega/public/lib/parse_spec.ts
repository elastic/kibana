/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseSpec as parseVegaSpec } from '@kbn/vega-utils';
import type { VegaSpec } from '@kbn/vega-schemas';
import type { VegaSpec as ParsedVegaSpec } from '../data_model/types';

/**
 * The spec as an object, or `undefined` when its HJSON doesn't parse to an object. The object is
 * not validated as a Vega spec, which the Vega parser does when the panel renders.
 */
export const parseSpec = (spec: VegaSpec): ParsedVegaSpec | undefined =>
  parseVegaSpec(spec) as ParsedVegaSpec | undefined;
