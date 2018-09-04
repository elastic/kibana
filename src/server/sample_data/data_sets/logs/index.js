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

import path from 'path';
import { savedObjects } from './saved_objects';

export function logsSpecProvider() {
  return {
    id: 'logs',
    name: 'Sample web logs',
    description: 'Sample data, visualizations, and dashboards for monitoring web logs.',
    previewImagePath: '/plugins/kibana/home/sample_data_resources/logs/dashboard.png',
    overviewDashboard: 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
    defaultIndex: '90943e30-9a47-11e8-b64d-95841ca0b247',
    dataPath: path.join(__dirname, './logs.json.gz'),
    fields: {
      request: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256
          }
        }
      },
      geo: {
        properties: {
          srcdest: {
            type: 'keyword'
          },
          src: {
            type: 'keyword'
          },
          dest: {
            type: 'keyword'
          },
          coordinates: {
            type: 'geo_point'
          }
        }
      },
      utc_time: {
        type: 'date'
      },
      url: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256
          }
        }
      },
      message: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256
          }
        }
      },
      host: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256
          }
        }
      },
      clientip: {
        type: 'ip'
      },
      response: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256
          }
        }
      },
      machine: {
        properties: {
          ram: {
            type: 'long'
          },
          os: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          }
        }
      },
      agent: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256
          }
        }
      },
      bytes: {
        type: 'long'
      },
      tags: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256
          }
        }
      },
      referer: {
        type: 'keyword'
      },
      ip: {
        type: 'ip'
      },
      timestamp: {
        type: 'date'
      },
      phpmemory: {
        type: 'long'
      },
      memory: {
        type: 'double'
      },
      extension: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256
          }
        }
      }
    },
    timeFields: ['timestamp'],
    currentTimeMarker: '2018-08-01T00:00:00',
    preserveDayOfWeekTimeOfDay: true,
    savedObjects: savedObjects,
  };
}
