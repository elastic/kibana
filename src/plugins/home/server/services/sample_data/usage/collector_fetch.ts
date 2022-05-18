/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import moment from 'moment';
import { SearchResponse } from '@kbn/core/server';
import { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';

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

type ESResponse = SearchResponse<SearchHit>;

export function fetchProvider(index: string) {
  return async ({ esClient }: CollectorFetchContext) => {
    const response = await esClient.search<ESResponse>(
      {
        index,
        body: {
          query: { term: { type: { value: 'sample-data-telemetry' } } },
          _source: { includes: ['sample-data-telemetry', 'type', 'updated_at'] },
        },
        filter_path: 'hits.hits._id,hits.hits._source',
      },
      {
        ignore: [404],
      }
    );

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
