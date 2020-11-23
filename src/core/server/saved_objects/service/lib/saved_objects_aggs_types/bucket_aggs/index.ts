/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as rt from 'io-ts';

import { fieldBasic } from '../helpers';

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
