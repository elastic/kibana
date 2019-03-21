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

import { i18n } from '@kbn/i18n';
import { getVisualizeLoader } from 'ui/visualize/loader';

export const visdata = () => ({
  name: 'visdata',
  type: 'datatable',
  help: i18n.translate('interpreter.functions.visualization.help', {
    defaultMessage: 'Loads saved visualization data'
  }),
  args: {
    id: {
      types: ['string'],
    },
    from: {
      types: ['string'],
    },
    to: {
      types: ['string'],
    }
  },
  async fn(context, args) {
    const loader = await getVisualizeLoader();
    const handler = await loader.loadById(args.id);
    handler.dataLoaderParams.timeRange = {
      from: args.from,
      to: args.to,
    };
    const data = await handler.fetch(true, true);

    if (!data.rows || !data.columns) throw('visualization datasource does not return table');

    return {
      type: 'datatable',
      rows: data.rows,
      columns: data.columns.map(column => ({
        name: column.id,
      })),
    };
  }
});
