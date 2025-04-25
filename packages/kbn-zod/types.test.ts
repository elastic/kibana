/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expectAssignable } from 'tsd';
import { ZodEsque } from './types';
import { z } from '.';

describe('ZodEsque', () => {
  it('correctly extracts generic from Zod values', () => {
    const s = z.object({ n: z.number() });
    expectAssignable<ZodEsque<{ n: number }>>(s);
  });
});
