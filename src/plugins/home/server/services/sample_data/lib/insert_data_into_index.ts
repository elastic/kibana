/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { DataIndexSchema } from './sample_dataset_registry_types';
import {
  translateTimeRelativeToDifference,
  translateTimeRelativeToWeek,
} from './translate_timestamp';
import { loadData } from './load_data';

export const insertDataIntoIndex = ({
  dataIndexConfig,
  logger,
  esClient,
  index,
  nowReference,
}: {
  dataIndexConfig: DataIndexSchema;
  index: string;
  nowReference: string;
  esClient: IScopedClusterClient;
  logger: Logger;
}) => {
  const updateTimestamps = (doc: any) => {
    dataIndexConfig.timeFields
      .filter((timeFieldName: string) => doc[timeFieldName])
      .forEach((timeFieldName: string) => {
        doc[timeFieldName] = dataIndexConfig.preserveDayOfWeekTimeOfDay
          ? translateTimeRelativeToWeek(
              doc[timeFieldName],
              dataIndexConfig.currentTimeMarker,
              nowReference
            )
          : translateTimeRelativeToDifference(
              doc[timeFieldName],
              dataIndexConfig.currentTimeMarker,
              nowReference
            );
      });
    return doc;
  };

  const bulkInsert = async (docs: unknown[]) => {
    const insertCmd = { index: { _index: index } };
    const bulk: unknown[] = [];
    docs.forEach((doc: unknown) => {
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
  return loadData(dataIndexConfig.dataPath, bulkInsert); // this returns a Promise
};
