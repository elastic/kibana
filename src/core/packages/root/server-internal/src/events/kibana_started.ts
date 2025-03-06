/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-server';

const KIBANA_STARTED_EVENT_NAME = 'kibana_started';

/** @internal */
export interface UptimePerStep {
  start: number;
  end: number;
}

/** @internal */
export interface UptimeSteps {
  constructor: UptimePerStep;
  preboot: UptimePerStep;
  setup: UptimePerStep;
  start: UptimePerStep;
  elasticsearch: {
    waitTime: number;
  };
  savedObjects: {
    migrationTime: number;
  };
}

export const registerKibanaStartedEvent = (analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType<{ uptime_per_step: UptimeSteps }>({
    eventType: KIBANA_STARTED_EVENT_NAME,
    schema: {
      uptime_per_step: {
        properties: {
          constructor: {
            properties: {
              start: {
                type: 'float',
                _meta: {
                  description:
                    'Number of milliseconds the Node.js process has been running until the constructor was called',
                },
              },
              end: {
                type: 'float',
                _meta: {
                  description:
                    'Number of milliseconds the Node.js process has been running until the constructor finished',
                },
              },
            },
          },
          preboot: {
            properties: {
              start: {
                type: 'float',
                _meta: {
                  description:
                    'Number of milliseconds the Node.js process has been running until `preboot` was called',
                },
              },
              end: {
                type: 'float',
                _meta: {
                  description:
                    'Number of milliseconds the Node.js process has been running until `preboot` finished',
                },
              },
            },
          },
          setup: {
            properties: {
              start: {
                type: 'float',
                _meta: {
                  description:
                    'Number of milliseconds the Node.js process has been running until `setup` was called',
                },
              },
              end: {
                type: 'float',
                _meta: {
                  description:
                    'Number of milliseconds the Node.js process has been running until `setup` finished',
                },
              },
            },
          },
          start: {
            properties: {
              start: {
                type: 'float',
                _meta: {
                  description:
                    'Number of milliseconds the Node.js process has been running until `start` was called',
                },
              },
              end: {
                type: 'float',
                _meta: {
                  description:
                    'Number of milliseconds the Node.js process has been running until `start` finished',
                },
              },
            },
          },
          elasticsearch: {
            properties: {
              waitTime: {
                type: 'long',
                _meta: {
                  description:
                    'Number of milliseconds Kibana waited for Elasticsearch during the its start phase',
                },
              },
            },
          },
          savedObjects: {
            properties: {
              migrationTime: {
                type: 'long',
                _meta: {
                  description: 'Number of milliseconds it took to run the SO migration',
                },
              },
            },
          },
        },
        _meta: {
          description:
            'Number of milliseconds the Node.js process has been running until each phase of the server execution is called and finished.',
        },
      },
    },
  });
};

/**
 * Reports the new and legacy KIBANA_STARTED_EVENT.
 */
export const reportKibanaStartedEvent = ({
  analytics,
  uptimeSteps,
}: {
  analytics: AnalyticsServiceStart;
  uptimeSteps: UptimeSteps;
}) => {
  // Report the legacy KIBANA_STARTED_EVENT.
  analytics.reportEvent(KIBANA_STARTED_EVENT_NAME, { uptime_per_step: uptimeSteps });

  // Report the metric-shaped KIBANA_STARTED_EVENT.
  reportPerformanceMetricEvent(analytics, {
    eventName: KIBANA_STARTED_EVENT_NAME,
    duration: uptimeSteps.start.end - uptimeSteps.constructor.start,
    key1: 'time_to_constructor',
    value1: uptimeSteps.constructor.start,
    key2: 'constructor_time',
    value2: uptimeSteps.constructor.end - uptimeSteps.constructor.start,
    key3: 'preboot_time',
    value3: uptimeSteps.preboot.end - uptimeSteps.preboot.start,
    key4: 'setup_time',
    value4: uptimeSteps.setup.end - uptimeSteps.setup.start,
    key5: 'start_time',
    value5: uptimeSteps.start.end - uptimeSteps.start.start,
    key6: 'es_wait_time',
    value6: uptimeSteps.elasticsearch.waitTime,
    key7: 'migration_time',
    value7: uptimeSteps.savedObjects.migrationTime,
  });
};
