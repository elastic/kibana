/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const fieldMappings = {
  request: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        time_series_dimension: true,
      },
    },
  },
  geo: {
    properties: {
      srcdest: {
        type: 'keyword',
      },
      src: {
        type: 'keyword',
      },
      dest: {
        type: 'keyword',
      },
      coordinates: {
        type: 'geo_point',
      },
    },
  },
  utc_time: {
    type: 'date',
  },
  url: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256,
      },
    },
  },
  message: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256,
      },
    },
  },
  host: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256,
      },
    },
  },
  clientip: {
    type: 'ip',
  },
  response: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256,
      },
    },
  },
  machine: {
    properties: {
      ram: {
        type: 'long',
      },
      os: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
    },
  },
  agent: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256,
      },
    },
  },
  bytes: {
    type: 'long',
  },
  tags: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256,
      },
    },
  },
  referer: {
    type: 'keyword',
  },
  ip: {
    type: 'ip',
  },
  ip_range: {
    type: 'ip_range',
  },
  '@timestamp': {
    type: 'date',
  },
  timestamp: {
    type: 'alias',
    path: '@timestamp',
  },
  timestamp_range: {
    type: 'date_range',
  },
  phpmemory: {
    type: 'long',
  },
  bytes_counter: {
    type: 'long',
    time_series_metric: 'counter',
  },
  bytes_gauge: {
    type: 'long',
    time_series_metric: 'gauge',
  },
  memory: {
    type: 'double',
  },
  extension: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256,
      },
    },
  },
  event: {
    properties: {
      dataset: {
        type: 'keyword',
      },
    },
  },
};
