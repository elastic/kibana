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
import moment, { Moment } from 'moment';
import { MakeSchemaFrom } from '../../plugins/usage_collection/server';

export interface Usage {
  locale: string;
}

export interface WithUnion {
  prop1: string | null;
  prop2: string | null | undefined;
  prop3?: string | null;
  prop4: 'opt1' | 'opt2';
  prop5: 123 | 431;
}

export interface WithMoment {
  prop1: Moment;
  prop2: moment.Moment;
  prop3: Moment[];
  prop4: Date[];
}

export interface WithConflictingUnion {
  prop1: 123 | 'str';
}

export interface WithUnsupportedUnion {
  prop1: 123 | Moment;
}

export const externallyDefinedSchema: MakeSchemaFrom<{ locale: string }> = {
  locale: {
    type: 'keyword',
  },
};
