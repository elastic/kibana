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

import { get } from 'lodash';
import moment from 'moment';

interface SearchHit {
  _id: string;
  _source: {
    'sample-data-telemetry': {
      installCount?: number;
      unInstallCount?: number;
    };
    updated_at: Date;
  };
}

export interface TelemetryResponse {
  installed: string[];
  uninstalled: string[];
  last_install_date: moment.Moment | null;
  last_install_set: string | null;
  last_uninstall_date: moment.Moment | null;
  last_uninstall_set: string | null;
}

export function fetchProvider(index: string) {
  return async (callCluster: any) => {
    const response = await callCluster('search', {
      index,
      body: {
        query: { term: { type: { value: 'sample-data-telemetry' } } },
        _source: { includes: ['sample-data-telemetry', 'type', 'updated_at'] },
      },
      filter_path: 'hits.hits._id,hits.hits._source',
      ignore: [404],
    });

    const getLast = (
      dataSet: string,
      dataDate: moment.Moment,
      accumSet: string | null,
      accumDate: moment.Moment | null
    ) => {
      let lastDate = accumDate;
      let lastSet = accumSet;

      if (!accumDate || (accumDate && dataDate > accumDate)) {
        // if a max date has not been accumulated yet, or if the current date is the new max
        lastDate = dataDate;
        lastSet = dataSet;
      }

      return { lastDate, lastSet };
    };

    const initial: TelemetryResponse = {
      installed: [],
      uninstalled: [],
      last_install_date: null,
      last_install_set: null,
      last_uninstall_date: null,
      last_uninstall_set: null,
    };

    const hits: any[] = get(response, 'hits.hits', []);
    if (hits == null || hits.length === 0) {
      return;
    }

    return hits.reduce((telemetry: TelemetryResponse, hit: SearchHit) => {
      const { installCount = 0, unInstallCount = 0 } = hit._source['sample-data-telemetry'] || {
        installCount: 0,
        unInstallCount: 0,
      };

      if (installCount === 0 && unInstallCount === 0) {
        return telemetry;
      }

      const isSampleDataSetInstalled = installCount - unInstallCount > 0;
      const dataSet = hit._id.replace('sample-data-telemetry:', ''); // sample-data-telemetry:ecommerce => ecommerce
      const dataDate = moment.utc(hit._source.updated_at);

      if (isSampleDataSetInstalled) {
        const { lastDate, lastSet } = getLast(
          dataSet,
          dataDate,
          telemetry.last_install_set,
          telemetry.last_install_date
        );

        return {
          ...telemetry,
          installed: telemetry.installed.concat(dataSet),
          last_install_date: lastDate,
          last_install_set: lastSet,
        };
      } else {
        const { lastDate, lastSet } = getLast(
          dataSet,
          dataDate,
          telemetry.last_uninstall_set,
          telemetry.last_uninstall_date
        );

        return {
          ...telemetry,
          uninstalled: telemetry.uninstalled.concat(dataSet),
          last_uninstall_date: lastDate,
          last_uninstall_set: lastSet,
        };
      }
    }, initial);
  };
}
