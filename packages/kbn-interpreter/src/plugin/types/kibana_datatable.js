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

import { map } from 'lodash';

export const kibanaDatatable = () => ({
  name: 'kibana_datatable',
  from: {
    datatable: context => {
      context.columns.forEach(c => c.id = c.name);
      return {
        type: 'kibana_datatable',
        rows: context.rows,
        columns: context.columns,
      };
    },
    pointseries: context => {
      const columns = map(context.columns, (column, name) => {
        return { id: name, name, ...column };
      });
      return {
        type: 'kibana_datatable',
        rows: context.rows,
        columns: columns,
      };
    }
  },
});
