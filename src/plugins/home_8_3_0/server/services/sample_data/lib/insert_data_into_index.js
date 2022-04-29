/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.insertDataIntoIndex = void 0;

const _translate_timestamp = require('./translate_timestamp');

const _load_data = require('./load_data');

const insertDataIntoIndex = ({ dataIndexConfig, logger, esClient, index, nowReference }) => {
  const updateTimestamps = (doc) => {
    dataIndexConfig.timeFields
      .filter((timeFieldName) => doc[timeFieldName])
      .forEach((timeFieldName) => {
        doc[timeFieldName] = dataIndexConfig.preserveDayOfWeekTimeOfDay
          ? (0, _translate_timestamp.translateTimeRelativeToWeek)(
              doc[timeFieldName],
              dataIndexConfig.currentTimeMarker,
              nowReference
            )
          : (0, _translate_timestamp.translateTimeRelativeToDifference)(
              doc[timeFieldName],
              dataIndexConfig.currentTimeMarker,
              nowReference
            );
      });
    return doc;
  };

  const bulkInsert = async (docs) => {
    const insertCmd = {
      index: {
        _index: index,
      },
    };
    const bulk = [];
    docs.forEach((doc) => {
      bulk.push(insertCmd);
      bulk.push(updateTimestamps(doc));
    });
    const resp = await esClient.asCurrentUser.bulk({
      body: bulk,
    });

    if (resp.errors) {
      const errMsg = `sample_data install errors while bulk inserting. Elasticsearch response: ${JSON.stringify(
        resp,
        null,
        ''
      )}`;
      logger.warn(errMsg);
      return Promise.reject(
        new Error(`Unable to load sample data into index "${index}", see kibana logs for details`)
      );
    }
  };

  return (0, _load_data.loadData)(dataIndexConfig.dataPath, bulkInsert); // this returns a Promise
};

exports.insertDataIntoIndex = insertDataIntoIndex;
