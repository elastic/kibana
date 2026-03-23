/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ModelVersionFixtures } from './types';

export function isValidFixtureFile(
  fixtures: ModelVersionFixtures,
  previous: string,
  current: string
): boolean {
  return (
    typeof fixtures === 'object' &&
    Object.keys(fixtures).length === 2 &&
    Boolean(fixtures[previous]?.length) &&
    Boolean(fixtures[current]?.length) &&
    fixtures[previous]?.length === fixtures[current]?.length &&
    !Boolean(fixtures[previous]?.[0]?.TODO) &&
    !Boolean(fixtures[previous]?.[0]?.NOTE) &&
    !Boolean(fixtures[previous]?.[0]?.HINT) &&
    !Boolean(fixtures[previous]?.[0]?.HINT2)
  );
}
