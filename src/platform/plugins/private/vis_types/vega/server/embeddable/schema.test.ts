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
 * 2.0", the "GNU Affero General Public License v3.0 only", or the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockGetDrilldownsSchema } from '@kbn/embeddable-plugin/server/mocks';
import { getVegaByValueSchema } from './schema';

const validate = (value: unknown) => getVegaByValueSchema(mockGetDrilldownsSchema).validate(value);

describe('getVegaByValueSchema', () => {
  it('round-trips the by-value spec and title fields', () => {
    const state = {
      spec: '{ mark: point }',
      title: 'Example',
      description: 'A Vega panel',
      hide_title: false,
      hide_border: true,
      time_range: { from: 'now-15m', to: 'now', mode: 'relative' as const },
    };

    expect(validate(state)).toEqual(state);
  });

  it('requires a string spec but does not parse its contents', () => {
    expect(() => validate({ title: 'Example' })).toThrow();
    expect(() => validate({ spec: { mark: 'point' } })).toThrow();
    expect(validate({ spec: 'not a Vega spec' })).toEqual({ spec: 'not a Vega spec' });
  });
});
