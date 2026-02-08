/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import { loadOas } from '../input/load_oas';
import { normalizeOas } from '../input/normalize_oas';
import type { NormalizedSpec } from '../input/normalize_oas';

export async function loadBaseline(path: string): Promise<NormalizedSpec | null> {
  if (!existsSync(path)) {
    return null;
  }

  const spec = await loadOas(path);
  return normalizeOas(spec);
}
