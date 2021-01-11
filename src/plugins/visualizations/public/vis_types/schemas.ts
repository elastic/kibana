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

import _, { defaults } from 'lodash';
import { AggGroupNames, AggParam } from '../../../data/public';
import type { ISchemas, Schema } from './types';

/** @private **/
export class Schemas implements ISchemas {
  all: Schema[] = [];
  [AggGroupNames.Buckets]: Schema[] = [];
  [AggGroupNames.Metrics]: Schema[] = [];

  constructor(schemas: Array<Partial<Schema>>) {
    _(schemas || [])
      .chain()
      .map((schema) => {
        if (!schema.name) throw new Error('all schema must have a unique name');

        if (schema.name === 'split') {
          schema.params = [
            {
              name: 'row',
              default: true,
            },
          ] as AggParam[];
        }

        defaults(schema, {
          min: 0,
          max: Infinity,
          group: AggGroupNames.Buckets,
          title: schema.name,
          aggFilter: '*',
          editor: false,
          params: [],
        });

        return schema as Schema;
      })
      .tap((fullSchemas: Schema[]) => {
        this.all = fullSchemas;
      })
      .groupBy('group')
      .forOwn((group, groupName) => {
        // @ts-ignore
        this[groupName] = group;
      })
      .commit();
  }
}
