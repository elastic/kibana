/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { healthFieldDefinition, matchesHealthFilter, readHealthFilter } from './resource_health';

describe('resource health filter', () => {
  it('resolves health labels and ids', () => {
    expect(healthFieldDefinition.resolveDisplayToId('Red')).toBe('red');
    expect(healthFieldDefinition.resolveDisplayToId('yellow')).toBe('yellow');
    expect(healthFieldDefinition.resolveIdToDisplay('green')).toBe('Green');
    expect(healthFieldDefinition.resolveDisplayToId('open')).toBeUndefined();
  });

  it('keeps rows that match an included health and drops rows without one', () => {
    const filter = readHealthFilter({ health: { include: ['yellow'], exclude: [] } });

    expect(matchesHealthFilter('yellow', filter)).toBe(true);
    expect(matchesHealthFilter('red', filter)).toBe(false);
    expect(matchesHealthFilter(undefined, filter)).toBe(false);
  });

  it('matches every row when no health filter is set', () => {
    const filter = readHealthFilter({});

    expect(matchesHealthFilter(undefined, filter)).toBe(true);
    expect(matchesHealthFilter('green', filter)).toBe(true);
  });
});
