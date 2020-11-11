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

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import * as rt from 'io-ts';

import { BucketAggsTypeRt } from './bucket_aggs';
import { MetricsAggsTypeRt } from './metrics_aggs';

import { SavedObjectsErrorHelpers } from '../errors';
import { excess, throwErrors } from './helpers';

const AllAggsRt = rt.intersection([BucketAggsTypeRt, MetricsAggsTypeRt]);

const SavedObjectsAggsRt = rt.record(
  rt.string,
  rt.intersection([AllAggsRt, rt.partial({ aggs: AllAggsRt })])
);

export type SavedObjectsAggs = rt.TypeOf<typeof SavedObjectsAggsRt>;

export const validateSavedObjectTypeAggs = (aggObjects: SavedObjectsAggs) => {
  pipe(
    excess(SavedObjectsAggsRt).decode(aggObjects),
    fold(throwErrors(SavedObjectsErrorHelpers.createBadRequestError), identity)
  );
};
