/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as rt from 'io-ts';
import { fieldBasic } from './base';

export const bucketAggsType: Record<string, Record<string, rt.Any>> = {
  filter: {
    term: rt.record(rt.string, rt.any),
  },
  histogram: {
    ...fieldBasic,
    interval: rt.number,
    min_doc_count: rt.number,
    extended_bounds: rt.type({ min: rt.number, max: rt.number }),
    keyed: rt.boolean,
    missing: rt.number,
    order: rt.record(rt.string, rt.literal('asc', 'desc')),
  },
  terms: {
    ...fieldBasic,
    collect_mode: rt.string,
    exclude: rt.unknown,
    execution_hint: rt.string,
    include: rt.unknown,
    missing: rt.string,
    min_doc_count: rt.number,
    size: rt.number,
    show_term_doc_count_error: rt.boolean,
    order: rt.record(rt.string, rt.literal('asc', 'desc')),
  },
};
