/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */


import {IClusterClient, Logger} from '@kbn/core/server';
import { CONNECTORS_INDEX } from '..';
import {isIndexNotFoundException} from "@kbn/search-connectors/utils/identify_exceptions";

export interface Telemetry {
  native: {
    total: number;
  };
  clients: {
    total: number;
  };
}

const defaultTelemetryMetrics: Telemetry = {
  native: {
    total: 0,
  },
  clients: {
    total: 0,
  },
};

export const fetchTelemetryMetrics = async (client: IClusterClient, log: Logger): Promise<Telemetry> => {
  try {
    const nativeCountResponse = await client.asInternalUser.count({
      index: CONNECTORS_INDEX,
      query: {
        bool: {
          filter: [
            {
              term: {
                is_native: true,
              },
            },
          ],
          must_not: [
            {
              term: {
                service_type: {
                  value: "elastic-crawler",
                },
              },
            },
          ],
        },
      },
    });

    const clientsCountResponse = await client.asInternalUser.count({
      index: CONNECTORS_INDEX,
      query: {
        bool: {
          filter: [
            {
              term: {
                is_native: false,
              },
            },
          ],
        },
      },
    });

    return {
      native: {
        total: nativeCountResponse.count,
      },
      clients: {
        total: clientsCountResponse.count,
      },
    } as Telemetry;
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      log.error(`Failed to retrieve telemetry data: ${error}`);
    }
    return defaultTelemetryMetrics;
  }
};
