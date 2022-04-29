/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.fetchProvider = fetchProvider;

const _lodash = require('lodash');

const _moment = _interopRequireDefault(require('moment'));

function fetchProvider(index) {
  return async ({ esClient }) => {
    const response = await esClient.search(
      {
        index,
        body: {
          query: {
            term: {
              type: {
                value: 'sample-data-telemetry',
              },
            },
          },
          _source: {
            includes: ['sample-data-telemetry', 'type', 'updated_at'],
          },
        },
        filter_path: 'hits.hits._id,hits.hits._source',
      },
      {
        ignore: [404],
      }
    );

    const getLast = (dataSet, dataDate, accumSet, accumDate) => {
      let lastDate = accumDate;
      let lastSet = accumSet;

      if (!accumDate || (accumDate && dataDate > accumDate)) {
        // if a max date has not been accumulated yet, or if the current date is the new max
        lastDate = dataDate;
        lastSet = dataSet;
      }

      return {
        lastDate,
        lastSet,
      };
    };

    const initial = {
      installed: [],
      uninstalled: [],
      last_install_date: null,
      last_install_set: null,
      last_uninstall_date: null,
      last_uninstall_set: null,
    };
    const hits = (0, _lodash.get)(response, 'hits.hits', []);

    if (hits == null || hits.length === 0) {
      return;
    }

    return hits.reduce((telemetry, hit) => {
      const { installCount = 0, unInstallCount = 0 } = hit._source['sample-data-telemetry'] || {
        installCount: 0,
        unInstallCount: 0,
      };

      if (installCount === 0 && unInstallCount === 0) {
        return telemetry;
      }

      const isSampleDataSetInstalled = installCount - unInstallCount > 0;

      const dataSet = hit._id.replace('sample-data-telemetry:', ''); // sample-data-telemetry:ecommerce => ecommerce

      const dataDate = _moment.default.utc(hit._source.updated_at);

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
