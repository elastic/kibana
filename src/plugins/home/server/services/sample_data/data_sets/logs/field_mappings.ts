/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const fieldMappings = {
  request: {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 256,
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
  timestamp: {
    type: 'date',
  },
  '@timestamp': {
    type: 'alias',
    path: 'timestamp',
  },
  phpmemory: {
    type: 'long',
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
