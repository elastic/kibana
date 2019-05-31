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

import _ from 'lodash';
import '../directives/buttons';
import { IndexedArray } from '../../../indexed_array';
import { AggParams } from '../../../agg_types/agg_params';
import rowsOrColumnsHtml from 'plugins/kbn_vislib_vis_types/controls/rows_or_columns.html';
import radiusRatioOptionHtml from 'plugins/kbn_vislib_vis_types/controls/radius_ratio_option.html';

class Schemas {
  constructor(schemas) {

    _(schemas || [])
      .map((schema) => {
        if (!schema.name) throw new Error('all schema must have a unique name');

        if (schema.name === 'split') {
          schema.params = [
            {
              name: 'row',
              default: true
            }
          ];
          schema.editor = rowsOrColumnsHtml;
        } else if (schema.name === 'radius') {
          schema.editor = radiusRatioOptionHtml;
        }

        _.defaults(schema, {
          min: 0,
          max: Infinity,
          group: 'buckets',
          title: schema.name,
          aggFilter: '*',
          editor: false,
          params: [],
          deprecate: false
        });

        // convert the params into a params registry
        schema.params = new AggParams(schema.params);

        return schema;
      })
      .tap((schemas) => {
        this.all = new IndexedArray({
          index: ['name'],
          group: ['group'],
          immutable: true,
          initialSet: schemas
        });
      })
      .groupBy('group')
      .forOwn((group, groupName) => {
        this[groupName] = new IndexedArray({
          index: ['name'],
          immutable: true,
          initialSet: group
        });
      })
      .commit();
  }
}

export { Schemas };

