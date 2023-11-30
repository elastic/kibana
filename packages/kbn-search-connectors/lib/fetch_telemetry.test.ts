/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CONNECTORS_INDEX } from '..';

import {fetchTelemetryMetrics, Telemetry} from "@kbn/search-connectors/lib/fetch_telemetry";

const indexNotFoundError = {
  meta: {
    body: {
      error: {
        type: 'index_not_found_exception',
      },
    },
  },
};

const otherError = {
  meta: {
    body: {
      error: {
        type: 'other_error',
      },
    },
  },
};

const nativeQuery = {
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
};

const clientsQuery = {
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
}

const defaultTelemetryMetrics: Telemetry = {
  native: {
    total: 0,
  },
  clients: {
    total: 0,
  },
};

describe('fetchTelemetryMetrics lib', () => {
  const mockClient = {
    asInternalUser: {
      count: jest.fn(),
    },
  } as any;
  const logMock = {
    error: jest.fn()
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetch telemetry metrics', () => {
    it('should fetch telemetry metrics', async () => {
      mockClient.asInternalUser.count.mockImplementationOnce(() =>
        Promise.resolve({
          count: 5,
        })
      );
      mockClient.asInternalUser.count.mockImplementationOnce(() =>
        Promise.resolve({
          count: 2,
        })
      );
      await expect(fetchTelemetryMetrics(mockClient, logMock)).resolves.toEqual({
        native: { total: 5 },
        clients: { total: 2 },
      });
      expect(mockClient.asInternalUser.count).toHaveBeenCalledWith(nativeQuery);
      expect(mockClient.asInternalUser.count).toHaveBeenCalledWith(clientsQuery)
    });
    it('should return default telemetry metrics on index not found error', async () => {
      mockClient.asInternalUser.count.mockImplementationOnce(() => Promise.reject(indexNotFoundError));
      await expect(fetchTelemetryMetrics(mockClient, logMock)).resolves.toEqual(defaultTelemetryMetrics);
      expect(mockClient.asInternalUser.count).toHaveBeenCalledWith(nativeQuery);
    });
    it('should return default telemetry metrics on other error', async () => {
      mockClient.asInternalUser.count.mockImplementationOnce(() => Promise.reject(otherError));
      await expect(fetchTelemetryMetrics(mockClient, logMock)).resolves.toEqual(defaultTelemetryMetrics);
      expect(mockClient.asInternalUser.count).toHaveBeenCalledWith(nativeQuery);
    });
  });
});
