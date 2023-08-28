/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export const alertsFieldMappings = {
  alert: {
    properties: {
      actions: {
        properties: {
          actionRef: {
            type: 'keyword',
          },
          actionTypeId: {
            type: 'keyword',
          },
          group: {
            type: 'keyword',
          },
          params: {
            enabled: false,
            type: 'object',
          },
        },
        type: 'nested',
      },
      alertTypeId: {
        type: 'keyword',
      },
      apiKey: {
        type: 'binary',
      },
      apiKeyOwner: {
        type: 'keyword',
      },
      consumer: {
        type: 'keyword',
      },
      createdAt: {
        type: 'date',
      },
      createdBy: {
        type: 'keyword',
      },
      enabled: {
        type: 'boolean',
      },
      muteAll: {
        type: 'boolean',
      },
      mutedInstanceIds: {
        type: 'keyword',
      },
      name: {
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
        type: 'text',
      },
      params: {
        enabled: false,
        type: 'object',
      },
      schedule: {
        properties: {
          interval: {
            type: 'keyword',
          },
        },
      },
      scheduledTaskId: {
        type: 'keyword',
      },
      tags: {
        type: 'keyword',
      },
      throttle: {
        type: 'keyword',
      },
      updatedBy: {
        type: 'keyword',
      },
      isSnoozedUntil: {
        type: 'date',
      },
      monitoring: {
        properties: {
          execution: {
            properties: {
              history: {
                properties: {
                  duration: {
                    type: 'long',
                  },
                  success: {
                    type: 'boolean',
                  },
                  timestamp: {
                    type: 'date',
                  },
                },
              },
              calculated_metrics: {
                properties: {
                  p50: {
                    type: 'long',
                  },
                  p95: {
                    type: 'long',
                  },
                  p99: {
                    type: 'long',
                  },
                  success_ratio: {
                    type: 'float',
                  },
                },
              },
            },
          },
        },
      },
      executionStatus: {
        properties: {
          numberOfTriggeredActions: {
            type: 'long',
          },
          status: {
            type: 'keyword',
          },
          lastExecutionDate: {
            type: 'date',
          },
          lastDuration: {
            type: 'long',
          },
          error: {
            properties: {
              reason: {
                type: 'keyword',
              },
              message: {
                type: 'keyword',
              },
            },
          },
          warning: {
            properties: {
              reason: {
                type: 'keyword',
              },
              message: {
                type: 'keyword',
              },
            },
          },
        },
      },
    },
  },
};
