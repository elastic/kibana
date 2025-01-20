/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IndexMap } from './core';

export const INDEX_MAP_BEFORE_SPLIT: IndexMap = {
  '.kibana': {
    typeMappings: {
      'core-usage-stats': {
        dynamic: false,
        properties: {},
      },
      'legacy-url-alias': {
        dynamic: false,
        properties: {
          sourceId: {
            type: 'keyword',
          },
          targetNamespace: {
            type: 'keyword',
          },
          targetType: {
            type: 'keyword',
          },
          targetId: {
            type: 'keyword',
          },
          resolveCounter: {
            type: 'long',
          },
          disabled: {
            type: 'boolean',
          },
        },
      },
      config: {
        dynamic: false,
        properties: {
          buildNum: {
            type: 'keyword',
          },
        },
      },
      'config-global': {
        dynamic: false,
        properties: {
          buildNum: {
            type: 'keyword',
          },
        },
      },
      'usage-counters': {
        dynamic: false,
        properties: {
          domainId: {
            type: 'keyword',
          },
        },
      },
      'guided-onboarding-guide-state': {
        dynamic: false,
        properties: {
          guideId: {
            type: 'keyword',
          },
          isActive: {
            type: 'boolean',
          },
        },
      },
      'guided-onboarding-plugin-state': {
        dynamic: false,
        properties: {},
      },
      'ui-metric': {
        properties: {
          count: {
            type: 'integer',
          },
        },
      },
      application_usage_totals: {
        dynamic: false,
        properties: {},
      },
      application_usage_daily: {
        dynamic: false,
        properties: {
          timestamp: {
            type: 'date',
          },
        },
      },
      event_loop_delays_daily: {
        dynamic: false,
        properties: {
          lastUpdatedAt: {
            type: 'date',
          },
        },
      },
      url: {
        properties: {
          slug: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          accessCount: {
            type: 'long',
          },
          accessDate: {
            type: 'date',
          },
          createDate: {
            type: 'date',
          },
          url: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 2048,
              },
            },
          },
          locatorJSON: {
            type: 'text',
            index: false,
          },
        },
      },
      'index-pattern': {
        dynamic: false,
        properties: {
          title: {
            type: 'text',
          },
          type: {
            type: 'keyword',
          },
          name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
        },
      },
      'sample-data-telemetry': {
        properties: {
          installCount: {
            type: 'long',
          },
          unInstallCount: {
            type: 'long',
          },
        },
      },
      space: {
        properties: {
          name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 2048,
              },
            },
          },
          description: {
            type: 'text',
          },
          initials: {
            type: 'keyword',
          },
          color: {
            type: 'keyword',
          },
          disabledFeatures: {
            type: 'keyword',
          },
          imageUrl: {
            type: 'text',
            index: false,
          },
          _reserved: {
            type: 'boolean',
          },
        },
      },
      'spaces-usage-stats': {
        dynamic: false,
        properties: {},
      },
      'exception-list-agnostic': {
        properties: {
          _tags: {
            type: 'keyword',
          },
          created_at: {
            type: 'keyword',
          },
          created_by: {
            type: 'keyword',
          },
          description: {
            type: 'keyword',
          },
          immutable: {
            type: 'boolean',
          },
          list_id: {
            type: 'keyword',
          },
          list_type: {
            type: 'keyword',
          },
          meta: {
            type: 'keyword',
          },
          name: {
            fields: {
              text: {
                type: 'text',
              },
            },
            type: 'keyword',
          },
          tags: {
            fields: {
              text: {
                type: 'text',
              },
            },
            type: 'keyword',
          },
          tie_breaker_id: {
            type: 'keyword',
          },
          type: {
            type: 'keyword',
          },
          updated_by: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
          comments: {
            properties: {
              comment: {
                type: 'keyword',
              },
              created_at: {
                type: 'keyword',
              },
              created_by: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              updated_at: {
                type: 'keyword',
              },
              updated_by: {
                type: 'keyword',
              },
            },
          },
          entries: {
            properties: {
              entries: {
                properties: {
                  field: {
                    type: 'keyword',
                  },
                  operator: {
                    type: 'keyword',
                  },
                  type: {
                    type: 'keyword',
                  },
                  value: {
                    fields: {
                      text: {
                        type: 'text',
                      },
                    },
                    type: 'keyword',
                  },
                },
              },
              field: {
                type: 'keyword',
              },
              list: {
                properties: {
                  id: {
                    type: 'keyword',
                  },
                  type: {
                    type: 'keyword',
                  },
                },
              },
              operator: {
                type: 'keyword',
              },
              type: {
                type: 'keyword',
              },
              value: {
                fields: {
                  text: {
                    type: 'text',
                  },
                },
                type: 'keyword',
              },
            },
          },
          expire_time: {
            type: 'date',
          },
          item_id: {
            type: 'keyword',
          },
          os_types: {
            type: 'keyword',
          },
        },
      },
      'exception-list': {
        properties: {
          _tags: {
            type: 'keyword',
          },
          created_at: {
            type: 'keyword',
          },
          created_by: {
            type: 'keyword',
          },
          description: {
            type: 'keyword',
          },
          immutable: {
            type: 'boolean',
          },
          list_id: {
            type: 'keyword',
          },
          list_type: {
            type: 'keyword',
          },
          meta: {
            type: 'keyword',
          },
          name: {
            fields: {
              text: {
                type: 'text',
              },
            },
            type: 'keyword',
          },
          tags: {
            fields: {
              text: {
                type: 'text',
              },
            },
            type: 'keyword',
          },
          tie_breaker_id: {
            type: 'keyword',
          },
          type: {
            type: 'keyword',
          },
          updated_by: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
          comments: {
            properties: {
              comment: {
                type: 'keyword',
              },
              created_at: {
                type: 'keyword',
              },
              created_by: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              updated_at: {
                type: 'keyword',
              },
              updated_by: {
                type: 'keyword',
              },
            },
          },
          entries: {
            properties: {
              entries: {
                properties: {
                  field: {
                    type: 'keyword',
                  },
                  operator: {
                    type: 'keyword',
                  },
                  type: {
                    type: 'keyword',
                  },
                  value: {
                    fields: {
                      text: {
                        type: 'text',
                      },
                    },
                    type: 'keyword',
                  },
                },
              },
              field: {
                type: 'keyword',
              },
              list: {
                properties: {
                  id: {
                    type: 'keyword',
                  },
                  type: {
                    type: 'keyword',
                  },
                },
              },
              operator: {
                type: 'keyword',
              },
              type: {
                type: 'keyword',
              },
              value: {
                fields: {
                  text: {
                    type: 'text',
                  },
                },
                type: 'keyword',
              },
            },
          },
          expire_time: {
            type: 'date',
          },
          item_id: {
            type: 'keyword',
          },
          os_types: {
            type: 'keyword',
          },
        },
      },
      telemetry: {
        properties: {
          enabled: {
            type: 'boolean',
          },
          sendUsageFrom: {
            type: 'keyword',
          },
          lastReported: {
            type: 'date',
          },
          lastVersionChecked: {
            type: 'keyword',
          },
          userHasSeenNotice: {
            type: 'boolean',
          },
          reportFailureCount: {
            type: 'integer',
          },
          reportFailureVersion: {
            type: 'keyword',
          },
          allowChangingOptInStatus: {
            type: 'boolean',
          },
        },
      },
      file: {
        dynamic: false,
        properties: {
          created: {
            type: 'date',
          },
          Updated: {
            type: 'date',
          },
          name: {
            type: 'text',
          },
          user: {
            type: 'flattened',
          },
          Status: {
            type: 'keyword',
          },
          mime_type: {
            type: 'keyword',
          },
          extension: {
            type: 'keyword',
          },
          size: {
            type: 'long',
          },
          Meta: {
            type: 'flattened',
          },
          FileKind: {
            type: 'keyword',
          },
        },
      },
      fileShare: {
        dynamic: false,
        properties: {
          created: {
            type: 'date',
          },
          valid_until: {
            type: 'long',
          },
          token: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
        },
      },
      action: {
        properties: {
          name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          actionTypeId: {
            type: 'keyword',
          },
          isMissingSecrets: {
            type: 'boolean',
          },
          config: {
            enabled: false,
            type: 'object',
          },
          secrets: {
            type: 'binary',
          },
        },
      },
      action_task_params: {
        dynamic: false,
        properties: {
          actionId: {
            type: 'keyword',
          },
          consumer: {
            type: 'keyword',
          },
          params: {
            enabled: false,
            type: 'object',
          },
          apiKey: {
            type: 'binary',
          },
          executionId: {
            type: 'keyword',
          },
          relatedSavedObjects: {
            enabled: false,
            type: 'object',
          },
        },
      },
      connector_token: {
        properties: {
          connectorId: {
            type: 'keyword',
          },
          tokenType: {
            type: 'keyword',
          },
          token: {
            type: 'binary',
          },
          expiresAt: {
            type: 'date',
          },
          createdAt: {
            type: 'date',
          },
          updatedAt: {
            type: 'date',
          },
        },
      },
      query: {
        properties: {
          title: {
            type: 'text',
          },
          description: {
            type: 'text',
          },
          query: {
            properties: {
              language: {
                type: 'keyword',
              },
              query: {
                type: 'keyword',
                index: false,
              },
            },
          },
          filters: {
            dynamic: false,
            properties: {},
          },
          timefilter: {
            dynamic: false,
            properties: {},
          },
        },
      },
      'kql-telemetry': {
        properties: {
          optInCount: {
            type: 'long',
          },
          optOutCount: {
            type: 'long',
          },
        },
      },
      'search-session': {
        properties: {
          sessionId: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          created: {
            type: 'date',
          },
          expires: {
            type: 'date',
          },
          appId: {
            type: 'keyword',
          },
          locatorId: {
            type: 'keyword',
          },
          initialState: {
            dynamic: false,
            properties: {},
          },
          restoreState: {
            dynamic: false,
            properties: {},
          },
          idMapping: {
            dynamic: false,
            properties: {},
          },
          realmType: {
            type: 'keyword',
          },
          realmName: {
            type: 'keyword',
          },
          username: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
          isCanceled: {
            type: 'boolean',
          },
        },
      },
      'search-telemetry': {
        dynamic: false,
        properties: {},
      },
      'file-upload-usage-collection-telemetry': {
        properties: {
          file_upload: {
            properties: {
              index_creation_count: {
                type: 'long',
              },
            },
          },
        },
      },
      alert: {
        properties: {
          enabled: {
            type: 'boolean',
          },
          name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                normalizer: 'lowercase',
              },
            },
          },
          tags: {
            type: 'keyword',
          },
          alertTypeId: {
            type: 'keyword',
          },
          schedule: {
            properties: {
              interval: {
                type: 'keyword',
              },
            },
          },
          consumer: {
            type: 'keyword',
          },
          legacyId: {
            type: 'keyword',
          },
          actions: {
            dynamic: false,
            type: 'nested',
            properties: {
              group: {
                type: 'keyword',
              },
              actionRef: {
                type: 'keyword',
              },
              actionTypeId: {
                type: 'keyword',
              },
              params: {
                dynamic: false,
                properties: {},
              },
              frequency: {
                properties: {
                  summary: {
                    index: false,
                    type: 'boolean',
                  },
                  notifyWhen: {
                    index: false,
                    type: 'keyword',
                  },
                  throttle: {
                    index: false,
                    type: 'keyword',
                  },
                },
              },
            },
          },
          params: {
            type: 'flattened',
            ignore_above: 4096,
          },
          mapped_params: {
            properties: {
              risk_score: {
                type: 'float',
              },
              severity: {
                type: 'keyword',
              },
            },
          },
          scheduledTaskId: {
            type: 'keyword',
          },
          createdBy: {
            type: 'keyword',
          },
          updatedBy: {
            type: 'keyword',
          },
          createdAt: {
            type: 'date',
          },
          updatedAt: {
            type: 'date',
          },
          apiKey: {
            type: 'binary',
          },
          apiKeyOwner: {
            type: 'keyword',
          },
          throttle: {
            type: 'keyword',
          },
          notifyWhen: {
            type: 'keyword',
          },
          muteAll: {
            type: 'boolean',
          },
          mutedInstanceIds: {
            type: 'keyword',
          },
          meta: {
            properties: {
              versionApiKeyLastmodified: {
                type: 'keyword',
              },
            },
          },
          monitoring: {
            properties: {
              run: {
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
                      outcome: {
                        type: 'keyword',
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
                  last_run: {
                    properties: {
                      timestamp: {
                        type: 'date',
                      },
                      metrics: {
                        properties: {
                          duration: {
                            type: 'long',
                          },
                          total_search_duration_ms: {
                            type: 'long',
                          },
                          total_indexing_duration_ms: {
                            type: 'long',
                          },
                          total_alerts_detected: {
                            type: 'float',
                          },
                          total_alerts_created: {
                            type: 'float',
                          },
                          gap_duration_s: {
                            type: 'float',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          snoozeSchedule: {
            type: 'nested',
            properties: {
              id: {
                type: 'keyword',
              },
              duration: {
                type: 'long',
              },
              skipRecurrences: {
                type: 'date',
                format: 'strict_date_time',
              },
              rRule: {
                type: 'nested',
                properties: {
                  freq: {
                    type: 'keyword',
                  },
                  dtstart: {
                    type: 'date',
                    format: 'strict_date_time',
                  },
                  tzid: {
                    type: 'keyword',
                  },
                  until: {
                    type: 'date',
                    format: 'strict_date_time',
                  },
                  count: {
                    type: 'long',
                  },
                  interval: {
                    type: 'long',
                  },
                  wkst: {
                    type: 'keyword',
                  },
                  byweekday: {
                    type: 'keyword',
                  },
                  bymonth: {
                    type: 'short',
                  },
                  bysetpos: {
                    type: 'long',
                  },
                  bymonthday: {
                    type: 'short',
                  },
                  byyearday: {
                    type: 'short',
                  },
                  byweekno: {
                    type: 'short',
                  },
                  byhour: {
                    type: 'long',
                  },
                  byminute: {
                    type: 'long',
                  },
                  bysecond: {
                    type: 'long',
                  },
                },
              },
            },
          },
          nextRun: {
            type: 'date',
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
          lastRun: {
            properties: {
              outcome: {
                type: 'keyword',
              },
              outcomeOrder: {
                type: 'float',
              },
              warning: {
                type: 'text',
              },
              outcomeMsg: {
                type: 'text',
              },
              alertsCount: {
                properties: {
                  active: {
                    type: 'float',
                  },
                  new: {
                    type: 'float',
                  },
                  recovered: {
                    type: 'float',
                  },
                  ignored: {
                    type: 'float',
                  },
                },
              },
            },
          },
          running: {
            type: 'boolean',
          },
        },
      },
      api_key_pending_invalidation: {
        properties: {
          apiKeyId: {
            type: 'keyword',
          },
          createdAt: {
            type: 'date',
          },
        },
      },
      'rules-settings': {
        properties: {
          flapping: {
            properties: {
              enabled: {
                type: 'boolean',
                index: false,
              },
              lookBackWindow: {
                type: 'long',
                index: false,
              },
              statusChangeThreshold: {
                type: 'long',
                index: false,
              },
              createdBy: {
                type: 'keyword',
                index: false,
              },
              updatedBy: {
                type: 'keyword',
                index: false,
              },
              createdAt: {
                type: 'date',
                index: false,
              },
              updatedAt: {
                type: 'date',
                index: false,
              },
            },
          },
        },
      },
      search: {
        properties: {
          columns: {
            type: 'keyword',
            index: false,
            doc_values: false,
          },
          description: {
            type: 'text',
          },
          viewMode: {
            type: 'keyword',
            index: false,
            doc_values: false,
          },
          hideChart: {
            type: 'boolean',
            index: false,
            doc_values: false,
          },
          isTextBasedQuery: {
            type: 'boolean',
            index: false,
            doc_values: false,
          },
          usesAdHocDataView: {
            type: 'boolean',
            index: false,
            doc_values: false,
          },
          hideAggregatedPreview: {
            type: 'boolean',
            index: false,
            doc_values: false,
          },
          hits: {
            type: 'integer',
            index: false,
            doc_values: false,
          },
          kibanaSavedObjectMeta: {
            properties: {
              searchSourceJSON: {
                type: 'text',
                index: false,
              },
            },
          },
          sort: {
            type: 'keyword',
            index: false,
            doc_values: false,
          },
          title: {
            type: 'text',
          },
          grid: {
            dynamic: false,
            properties: {},
          },
          version: {
            type: 'integer',
          },
          rowHeight: {
            type: 'text',
          },
          timeRestore: {
            type: 'boolean',
            index: false,
            doc_values: false,
          },
          timeRange: {
            dynamic: false,
            properties: {
              from: {
                type: 'keyword',
                index: false,
                doc_values: false,
              },
              to: {
                type: 'keyword',
                index: false,
                doc_values: false,
              },
            },
          },
          refreshInterval: {
            dynamic: false,
            properties: {
              pause: {
                type: 'boolean',
                index: false,
                doc_values: false,
              },
              value: {
                type: 'integer',
                index: false,
                doc_values: false,
              },
            },
          },
          rowsPerPage: {
            type: 'integer',
            index: false,
            doc_values: false,
          },
          breakdownField: {
            type: 'text',
          },
        },
      },
      tag: {
        properties: {
          name: {
            type: 'text',
          },
          description: {
            type: 'text',
          },
          color: {
            type: 'text',
          },
        },
      },
      'graph-workspace': {
        properties: {
          description: {
            type: 'text',
          },
          kibanaSavedObjectMeta: {
            properties: {
              searchSourceJSON: {
                type: 'text',
              },
            },
          },
          numLinks: {
            type: 'integer',
          },
          numVertices: {
            type: 'integer',
          },
          title: {
            type: 'text',
          },
          version: {
            type: 'integer',
          },
          wsState: {
            type: 'text',
          },
          legacyIndexPatternRef: {
            type: 'text',
            index: false,
          },
        },
      },
      visualization: {
        properties: {
          description: {
            type: 'text',
          },
          kibanaSavedObjectMeta: {
            properties: {
              searchSourceJSON: {
                type: 'text',
                index: false,
              },
            },
          },
          savedSearchRefName: {
            type: 'keyword',
            index: false,
            doc_values: false,
          },
          title: {
            type: 'text',
          },
          uiStateJSON: {
            type: 'text',
            index: false,
          },
          version: {
            type: 'integer',
          },
          visState: {
            type: 'text',
            index: false,
          },
        },
      },
      dashboard: {
        properties: {
          description: {
            type: 'text',
          },
          hits: {
            type: 'integer',
            index: false,
            doc_values: false,
          },
          kibanaSavedObjectMeta: {
            properties: {
              searchSourceJSON: {
                type: 'text',
                index: false,
              },
            },
          },
          optionsJSON: {
            type: 'text',
            index: false,
          },
          panelsJSON: {
            type: 'text',
            index: false,
          },
          refreshInterval: {
            properties: {
              display: {
                type: 'keyword',
                index: false,
                doc_values: false,
              },
              pause: {
                type: 'boolean',
                index: false,
                doc_values: false,
              },
              section: {
                type: 'integer',
                index: false,
                doc_values: false,
              },
              value: {
                type: 'integer',
                index: false,
                doc_values: false,
              },
            },
          },
          controlGroupInput: {
            properties: {
              controlStyle: {
                type: 'keyword',
                index: false,
                doc_values: false,
              },
              chainingSystem: {
                type: 'keyword',
                index: false,
                doc_values: false,
              },
              panelsJSON: {
                type: 'text',
                index: false,
              },
              ignoreParentSettingsJSON: {
                type: 'text',
                index: false,
              },
            },
          },
          timeFrom: {
            type: 'keyword',
            index: false,
            doc_values: false,
          },
          timeRestore: {
            type: 'boolean',
            index: false,
            doc_values: false,
          },
          timeTo: {
            type: 'keyword',
            index: false,
            doc_values: false,
          },
          title: {
            type: 'text',
          },
          version: {
            type: 'integer',
          },
        },
      },
      todo: {
        properties: {
          title: {
            type: 'keyword',
          },
          task: {
            type: 'text',
          },
          icon: {
            type: 'keyword',
          },
        },
      },
      book: {
        properties: {
          title: {
            type: 'keyword',
          },
          author: {
            type: 'keyword',
          },
          readIt: {
            type: 'boolean',
          },
        },
      },
      searchableList: {
        properties: {
          title: {
            type: 'text',
          },
          version: {
            type: 'integer',
          },
        },
      },
      lens: {
        properties: {
          title: {
            type: 'text',
          },
          description: {
            type: 'text',
          },
          visualizationType: {
            type: 'keyword',
          },
          state: {
            type: 'flattened',
          },
          expression: {
            index: false,
            doc_values: false,
            type: 'keyword',
          },
        },
      },
      'lens-ui-telemetry': {
        properties: {
          name: {
            type: 'keyword',
          },
          type: {
            type: 'keyword',
          },
          date: {
            type: 'date',
          },
          count: {
            type: 'integer',
          },
        },
      },
      map: {
        properties: {
          description: {
            type: 'text',
          },
          title: {
            type: 'text',
          },
          version: {
            type: 'integer',
          },
          mapStateJSON: {
            type: 'text',
          },
          layerListJSON: {
            type: 'text',
          },
          uiStateJSON: {
            type: 'text',
          },
          bounds: {
            dynamic: false,
            properties: {},
          },
        },
      },
      'cases-comments': {
        dynamic: false,
        properties: {
          comment: {
            type: 'text',
          },
          owner: {
            type: 'keyword',
          },
          type: {
            type: 'keyword',
          },
          actions: {
            properties: {
              type: {
                type: 'keyword',
              },
            },
          },
          alertId: {
            type: 'keyword',
          },
          created_at: {
            type: 'date',
          },
          created_by: {
            properties: {
              username: {
                type: 'keyword',
              },
            },
          },
          externalReferenceAttachmentTypeId: {
            type: 'keyword',
          },
          persistableStateAttachmentTypeId: {
            type: 'keyword',
          },
          pushed_at: {
            type: 'date',
          },
          updated_at: {
            type: 'date',
          },
        },
      },
      'cases-configure': {
        dynamic: false,
        properties: {
          created_at: {
            type: 'date',
          },
          closure_type: {
            type: 'keyword',
          },
          owner: {
            type: 'keyword',
          },
        },
      },
      'cases-connector-mappings': {
        dynamic: false,
        properties: {
          owner: {
            type: 'keyword',
          },
        },
      },
      cases: {
        dynamic: false,
        properties: {
          assignees: {
            properties: {
              uid: {
                type: 'keyword',
              },
            },
          },
          closed_at: {
            type: 'date',
          },
          closed_by: {
            properties: {
              username: {
                type: 'keyword',
              },
              full_name: {
                type: 'keyword',
              },
              email: {
                type: 'keyword',
              },
              profile_uid: {
                type: 'keyword',
              },
            },
          },
          created_at: {
            type: 'date',
          },
          created_by: {
            properties: {
              username: {
                type: 'keyword',
              },
              full_name: {
                type: 'keyword',
              },
              email: {
                type: 'keyword',
              },
              profile_uid: {
                type: 'keyword',
              },
            },
          },
          duration: {
            type: 'unsigned_long',
          },
          description: {
            type: 'text',
          },
          connector: {
            properties: {
              name: {
                type: 'text',
              },
              type: {
                type: 'keyword',
              },
              fields: {
                properties: {
                  key: {
                    type: 'text',
                  },
                  value: {
                    type: 'text',
                  },
                },
              },
            },
          },
          external_service: {
            properties: {
              pushed_at: {
                type: 'date',
              },
              pushed_by: {
                properties: {
                  username: {
                    type: 'keyword',
                  },
                  full_name: {
                    type: 'keyword',
                  },
                  email: {
                    type: 'keyword',
                  },
                  profile_uid: {
                    type: 'keyword',
                  },
                },
              },
              connector_name: {
                type: 'keyword',
              },
              external_id: {
                type: 'keyword',
              },
              external_title: {
                type: 'text',
              },
              external_url: {
                type: 'text',
              },
            },
          },
          owner: {
            type: 'keyword',
          },
          title: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          status: {
            type: 'short',
          },
          tags: {
            type: 'keyword',
          },
          updated_at: {
            type: 'date',
          },
          updated_by: {
            properties: {
              username: {
                type: 'keyword',
              },
              full_name: {
                type: 'keyword',
              },
              email: {
                type: 'keyword',
              },
              profile_uid: {
                type: 'keyword',
              },
            },
          },
          settings: {
            properties: {
              syncAlerts: {
                type: 'boolean',
              },
            },
          },
          severity: {
            type: 'short',
          },
          total_alerts: {
            type: 'integer',
          },
          total_comments: {
            type: 'integer',
          },
        },
      },
      'cases-user-actions': {
        dynamic: false,
        properties: {
          action: {
            type: 'keyword',
          },
          created_at: {
            type: 'date',
          },
          created_by: {
            properties: {
              username: {
                type: 'keyword',
              },
            },
          },
          payload: {
            dynamic: false,
            properties: {
              connector: {
                properties: {
                  type: {
                    type: 'keyword',
                  },
                },
              },
              comment: {
                properties: {
                  type: {
                    type: 'keyword',
                  },
                  externalReferenceAttachmentTypeId: {
                    type: 'keyword',
                  },
                  persistableStateAttachmentTypeId: {
                    type: 'keyword',
                  },
                },
              },
              assignees: {
                properties: {
                  uid: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
          owner: {
            type: 'keyword',
          },
          type: {
            type: 'keyword',
          },
        },
      },
      'cases-telemetry': {
        dynamic: false,
        properties: {},
      },
      'canvas-element': {
        dynamic: false,
        properties: {
          name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          help: {
            type: 'text',
          },
          content: {
            type: 'text',
          },
          image: {
            type: 'text',
          },
          '@timestamp': {
            type: 'date',
          },
          '@created': {
            type: 'date',
          },
        },
      },
      'canvas-workpad': {
        dynamic: false,
        properties: {
          name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          '@timestamp': {
            type: 'date',
          },
          '@created': {
            type: 'date',
          },
        },
      },
      'canvas-workpad-template': {
        dynamic: false,
        properties: {
          name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          help: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          tags: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          template_key: {
            type: 'keyword',
          },
        },
      },
      slo: {
        dynamic: false,
        properties: {
          id: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          description: {
            type: 'text',
          },
          indicator: {
            properties: {
              type: {
                type: 'keyword',
              },
              params: {
                type: 'flattened',
              },
            },
          },
          timeWindow: {
            properties: {
              duration: {
                type: 'keyword',
              },
              isRolling: {
                type: 'boolean',
              },
              calendar: {
                properties: {
                  startTime: {
                    type: 'date',
                  },
                },
              },
            },
          },
          budgetingMethod: {
            type: 'keyword',
          },
          objective: {
            properties: {
              target: {
                type: 'float',
              },
              timesliceTarget: {
                type: 'float',
              },
              timesliceWindow: {
                type: 'keyword',
              },
            },
          },
          settings: {
            properties: {
              timestampField: {
                type: 'keyword',
              },
              syncDelay: {
                type: 'keyword',
              },
              frequency: {
                type: 'keyword',
              },
            },
          },
          revision: {
            type: 'short',
          },
          enabled: {
            type: 'boolean',
          },
          createdAt: {
            type: 'date',
          },
          updatedAt: {
            type: 'date',
          },
        },
      },
      ingest_manager_settings: {
        properties: {
          fleet_server_hosts: {
            type: 'keyword',
          },
          has_seen_add_data_notice: {
            type: 'boolean',
            index: false,
          },
          prerelease_integrations_enabled: {
            type: 'boolean',
          },
        },
      },
      'ingest-agent-policies': {
        properties: {
          name: {
            type: 'keyword',
          },
          schema_version: {
            type: 'version',
          },
          description: {
            type: 'text',
          },
          namespace: {
            type: 'keyword',
          },
          is_managed: {
            type: 'boolean',
          },
          is_default: {
            type: 'boolean',
          },
          is_default_fleet_server: {
            type: 'boolean',
          },
          status: {
            type: 'keyword',
          },
          unenroll_timeout: {
            type: 'integer',
          },
          inactivity_timeout: {
            type: 'integer',
          },
          updated_at: {
            type: 'date',
          },
          updated_by: {
            type: 'keyword',
          },
          revision: {
            type: 'integer',
          },
          monitoring_enabled: {
            type: 'keyword',
            index: false,
          },
          is_preconfigured: {
            type: 'keyword',
          },
          data_output_id: {
            type: 'keyword',
          },
          monitoring_output_id: {
            type: 'keyword',
          },
          download_source_id: {
            type: 'keyword',
          },
          fleet_server_host_id: {
            type: 'keyword',
          },
          agent_features: {
            properties: {
              name: {
                type: 'keyword',
              },
              enabled: {
                type: 'boolean',
              },
            },
          },
        },
      },
      'ingest-outputs': {
        properties: {
          output_id: {
            type: 'keyword',
            index: false,
          },
          name: {
            type: 'keyword',
          },
          type: {
            type: 'keyword',
          },
          is_default: {
            type: 'boolean',
          },
          is_default_monitoring: {
            type: 'boolean',
          },
          hosts: {
            type: 'keyword',
          },
          ca_sha256: {
            type: 'keyword',
            index: false,
          },
          ca_trusted_fingerprint: {
            type: 'keyword',
            index: false,
          },
          config: {
            type: 'flattened',
          },
          config_yaml: {
            type: 'text',
          },
          is_preconfigured: {
            type: 'boolean',
            index: false,
          },
          ssl: {
            type: 'binary',
          },
          proxy_id: {
            type: 'keyword',
          },
          shipper: {
            dynamic: false,
            properties: {},
          },
        },
      },
      'ingest-package-policies': {
        properties: {
          name: {
            type: 'keyword',
          },
          description: {
            type: 'text',
          },
          namespace: {
            type: 'keyword',
          },
          enabled: {
            type: 'boolean',
          },
          is_managed: {
            type: 'boolean',
          },
          policy_id: {
            type: 'keyword',
          },
          package: {
            properties: {
              name: {
                type: 'keyword',
              },
              title: {
                type: 'keyword',
              },
              version: {
                type: 'keyword',
              },
            },
          },
          elasticsearch: {
            dynamic: false,
            properties: {},
          },
          vars: {
            type: 'flattened',
          },
          inputs: {
            dynamic: false,
            properties: {},
          },
          revision: {
            type: 'integer',
          },
          updated_at: {
            type: 'date',
          },
          updated_by: {
            type: 'keyword',
          },
          created_at: {
            type: 'date',
          },
          created_by: {
            type: 'keyword',
          },
        },
      },
      'epm-packages': {
        properties: {
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
          internal: {
            type: 'boolean',
          },
          keep_policies_up_to_date: {
            type: 'boolean',
            index: false,
          },
          es_index_patterns: {
            dynamic: false,
            properties: {},
          },
          verification_status: {
            type: 'keyword',
          },
          verification_key_id: {
            type: 'keyword',
          },
          installed_es: {
            type: 'nested',
            properties: {
              id: {
                type: 'keyword',
              },
              type: {
                type: 'keyword',
              },
              version: {
                type: 'keyword',
              },
            },
          },
          installed_kibana: {
            dynamic: false,
            properties: {},
          },
          installed_kibana_space_id: {
            type: 'keyword',
          },
          package_assets: {
            dynamic: false,
            properties: {},
          },
          install_started_at: {
            type: 'date',
          },
          install_version: {
            type: 'keyword',
          },
          install_status: {
            type: 'keyword',
          },
          install_source: {
            type: 'keyword',
          },
          install_format_schema_version: {
            type: 'version',
          },
          experimental_data_stream_features: {
            type: 'nested',
            properties: {
              data_stream: {
                type: 'keyword',
              },
              features: {
                type: 'nested',
                dynamic: false,
                properties: {
                  synthetic_source: {
                    type: 'boolean',
                  },
                  tsdb: {
                    type: 'boolean',
                  },
                },
              },
            },
          },
        },
      },
      'epm-packages-assets': {
        properties: {
          package_name: {
            type: 'keyword',
          },
          package_version: {
            type: 'keyword',
          },
          install_source: {
            type: 'keyword',
          },
          asset_path: {
            type: 'keyword',
          },
          media_type: {
            type: 'keyword',
          },
          data_utf8: {
            type: 'text',
            index: false,
          },
          data_base64: {
            type: 'binary',
          },
        },
      },
      'fleet-preconfiguration-deletion-record': {
        properties: {
          id: {
            type: 'keyword',
          },
        },
      },
      'ingest-download-sources': {
        properties: {
          source_id: {
            type: 'keyword',
            index: false,
          },
          name: {
            type: 'keyword',
          },
          is_default: {
            type: 'boolean',
          },
          host: {
            type: 'keyword',
          },
        },
      },
      'fleet-fleet-server-host': {
        properties: {
          name: {
            type: 'keyword',
          },
          is_default: {
            type: 'boolean',
          },
          host_urls: {
            type: 'keyword',
            index: false,
          },
          is_preconfigured: {
            type: 'boolean',
          },
          proxy_id: {
            type: 'keyword',
          },
        },
      },
      'fleet-proxy': {
        properties: {
          name: {
            type: 'keyword',
          },
          url: {
            type: 'keyword',
            index: false,
          },
          proxy_headers: {
            type: 'text',
            index: false,
          },
          certificate_authorities: {
            type: 'keyword',
            index: false,
          },
          certificate: {
            type: 'keyword',
            index: false,
          },
          certificate_key: {
            type: 'keyword',
            index: false,
          },
          is_preconfigured: {
            type: 'boolean',
          },
        },
      },
      'fleet-message-signing-keys': {
        dynamic: false,
        properties: {},
      },
      'osquery-manager-usage-metric': {
        properties: {
          count: {
            type: 'long',
          },
          errors: {
            type: 'long',
          },
        },
      },
      'osquery-saved-query': {
        dynamic: false,
        properties: {
          description: {
            type: 'text',
          },
          id: {
            type: 'keyword',
          },
          query: {
            type: 'text',
          },
          created_at: {
            type: 'date',
          },
          created_by: {
            type: 'text',
          },
          platform: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
          updated_at: {
            type: 'date',
          },
          updated_by: {
            type: 'text',
          },
          interval: {
            type: 'keyword',
          },
          ecs_mapping: {
            dynamic: false,
            properties: {},
          },
        },
      },
      'osquery-pack': {
        properties: {
          description: {
            type: 'text',
          },
          name: {
            type: 'text',
          },
          created_at: {
            type: 'date',
          },
          created_by: {
            type: 'keyword',
          },
          updated_at: {
            type: 'date',
          },
          updated_by: {
            type: 'keyword',
          },
          enabled: {
            type: 'boolean',
          },
          shards: {
            dynamic: false,
            properties: {},
          },
          version: {
            type: 'long',
          },
          queries: {
            dynamic: false,
            properties: {
              id: {
                type: 'keyword',
              },
              query: {
                type: 'text',
              },
              interval: {
                type: 'text',
              },
              platform: {
                type: 'keyword',
              },
              version: {
                type: 'keyword',
              },
              ecs_mapping: {
                dynamic: false,
                properties: {},
              },
            },
          },
        },
      },
      'osquery-pack-asset': {
        dynamic: false,
        properties: {
          description: {
            type: 'text',
          },
          name: {
            type: 'text',
          },
          version: {
            type: 'long',
          },
          shards: {
            dynamic: false,
            properties: {},
          },
          queries: {
            dynamic: false,
            properties: {
              id: {
                type: 'keyword',
              },
              query: {
                type: 'text',
              },
              interval: {
                type: 'text',
              },
              platform: {
                type: 'keyword',
              },
              version: {
                type: 'keyword',
              },
              ecs_mapping: {
                dynamic: false,
                properties: {},
              },
            },
          },
        },
      },
      'csp-rule-template': {
        dynamic: false,
        properties: {
          metadata: {
            type: 'object',
            properties: {
              name: {
                type: 'keyword',
                fields: {
                  text: {
                    type: 'text',
                  },
                },
              },
              benchmark: {
                type: 'object',
                properties: {
                  id: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
        },
      },
      'ml-job': {
        properties: {
          job_id: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          datafeed_id: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          type: {
            type: 'keyword',
          },
        },
      },
      'ml-trained-model': {
        properties: {
          model_id: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          job: {
            properties: {
              job_id: {
                type: 'text',
                fields: {
                  keyword: {
                    type: 'keyword',
                  },
                },
              },
              create_time: {
                type: 'date',
              },
            },
          },
        },
      },
      'ml-module': {
        dynamic: false,
        properties: {
          id: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          title: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          description: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          type: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          logo: {
            type: 'object',
          },
          defaultIndexPattern: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          query: {
            type: 'object',
          },
          jobs: {
            type: 'object',
          },
          datafeeds: {
            type: 'object',
          },
        },
      },
      'uptime-dynamic-settings': {
        dynamic: false,
        properties: {},
      },
      'synthetics-privates-locations': {
        dynamic: false,
        properties: {},
      },
      'synthetics-monitor': {
        dynamic: false,
        properties: {
          name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
                normalizer: 'lowercase',
              },
            },
          },
          type: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
          urls: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
          hosts: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
          journey_id: {
            type: 'keyword',
          },
          project_id: {
            type: 'keyword',
            fields: {
              text: {
                type: 'text',
              },
            },
          },
          origin: {
            type: 'keyword',
          },
          hash: {
            type: 'keyword',
          },
          locations: {
            properties: {
              id: {
                type: 'keyword',
                ignore_above: 256,
                fields: {
                  text: {
                    type: 'text',
                  },
                },
              },
              label: {
                type: 'text',
              },
            },
          },
          custom_heartbeat_id: {
            type: 'keyword',
          },
          id: {
            type: 'keyword',
          },
          tags: {
            type: 'keyword',
            fields: {
              text: {
                type: 'text',
              },
            },
          },
          schedule: {
            properties: {
              number: {
                type: 'integer',
              },
            },
          },
          enabled: {
            type: 'boolean',
          },
          alert: {
            properties: {
              status: {
                properties: {
                  enabled: {
                    type: 'boolean',
                  },
                },
              },
            },
          },
        },
      },
      'uptime-synthetics-api-key': {
        dynamic: false,
        properties: {
          apiKey: {
            type: 'binary',
          },
        },
      },
      'synthetics-param': {
        dynamic: false,
        properties: {},
      },
      'siem-ui-timeline-note': {
        properties: {
          eventId: {
            type: 'keyword',
          },
          note: {
            type: 'text',
          },
          created: {
            type: 'date',
          },
          createdBy: {
            type: 'text',
          },
          updated: {
            type: 'date',
          },
          updatedBy: {
            type: 'text',
          },
        },
      },
      'siem-ui-timeline-pinned-event': {
        properties: {
          eventId: {
            type: 'keyword',
          },
          created: {
            type: 'date',
          },
          createdBy: {
            type: 'text',
          },
          updated: {
            type: 'date',
          },
          updatedBy: {
            type: 'text',
          },
        },
      },
      'siem-detection-engine-rule-actions': {
        properties: {
          alertThrottle: {
            type: 'keyword',
          },
          ruleAlertId: {
            type: 'keyword',
          },
          ruleThrottle: {
            type: 'keyword',
          },
          actions: {
            properties: {
              actionRef: {
                type: 'keyword',
              },
              group: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              action_type_id: {
                type: 'keyword',
              },
              params: {
                dynamic: false,
                properties: {},
              },
            },
          },
        },
      },
      'security-rule': {
        dynamic: false,
        properties: {
          name: {
            type: 'keyword',
          },
          rule_id: {
            type: 'keyword',
          },
          version: {
            type: 'long',
          },
        },
      },
      'siem-ui-timeline': {
        properties: {
          columns: {
            properties: {
              aggregatable: {
                type: 'boolean',
              },
              category: {
                type: 'keyword',
              },
              columnHeaderType: {
                type: 'keyword',
              },
              description: {
                type: 'text',
              },
              example: {
                type: 'text',
              },
              indexes: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              name: {
                type: 'text',
              },
              placeholder: {
                type: 'text',
              },
              searchable: {
                type: 'boolean',
              },
              type: {
                type: 'keyword',
              },
            },
          },
          dataProviders: {
            properties: {
              id: {
                type: 'keyword',
              },
              name: {
                type: 'text',
              },
              enabled: {
                type: 'boolean',
              },
              excluded: {
                type: 'boolean',
              },
              kqlQuery: {
                type: 'text',
              },
              type: {
                type: 'text',
              },
              queryMatch: {
                properties: {
                  field: {
                    type: 'text',
                  },
                  displayField: {
                    type: 'text',
                  },
                  value: {
                    type: 'text',
                  },
                  displayValue: {
                    type: 'text',
                  },
                  operator: {
                    type: 'text',
                  },
                },
              },
              and: {
                properties: {
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'text',
                  },
                  enabled: {
                    type: 'boolean',
                  },
                  excluded: {
                    type: 'boolean',
                  },
                  kqlQuery: {
                    type: 'text',
                  },
                  type: {
                    type: 'text',
                  },
                  queryMatch: {
                    properties: {
                      field: {
                        type: 'text',
                      },
                      displayField: {
                        type: 'text',
                      },
                      value: {
                        type: 'text',
                      },
                      displayValue: {
                        type: 'text',
                      },
                      operator: {
                        type: 'text',
                      },
                    },
                  },
                },
              },
            },
          },
          description: {
            type: 'text',
          },
          eqlOptions: {
            properties: {
              eventCategoryField: {
                type: 'text',
              },
              tiebreakerField: {
                type: 'text',
              },
              timestampField: {
                type: 'text',
              },
              query: {
                type: 'text',
              },
              size: {
                type: 'text',
              },
            },
          },
          eventType: {
            type: 'keyword',
          },
          excludedRowRendererIds: {
            type: 'text',
          },
          favorite: {
            properties: {
              keySearch: {
                type: 'text',
              },
              fullName: {
                type: 'text',
              },
              userName: {
                type: 'text',
              },
              favoriteDate: {
                type: 'date',
              },
            },
          },
          filters: {
            properties: {
              meta: {
                properties: {
                  alias: {
                    type: 'text',
                  },
                  controlledBy: {
                    type: 'text',
                  },
                  disabled: {
                    type: 'boolean',
                  },
                  field: {
                    type: 'text',
                  },
                  formattedValue: {
                    type: 'text',
                  },
                  index: {
                    type: 'keyword',
                  },
                  key: {
                    type: 'keyword',
                  },
                  negate: {
                    type: 'boolean',
                  },
                  params: {
                    type: 'text',
                  },
                  type: {
                    type: 'keyword',
                  },
                  value: {
                    type: 'text',
                  },
                },
              },
              exists: {
                type: 'text',
              },
              match_all: {
                type: 'text',
              },
              missing: {
                type: 'text',
              },
              query: {
                type: 'text',
              },
              range: {
                type: 'text',
              },
              script: {
                type: 'text',
              },
            },
          },
          indexNames: {
            type: 'text',
          },
          kqlMode: {
            type: 'keyword',
          },
          kqlQuery: {
            properties: {
              filterQuery: {
                properties: {
                  kuery: {
                    properties: {
                      kind: {
                        type: 'keyword',
                      },
                      expression: {
                        type: 'text',
                      },
                    },
                  },
                  serializedQuery: {
                    type: 'text',
                  },
                },
              },
            },
          },
          title: {
            type: 'text',
          },
          templateTimelineId: {
            type: 'text',
          },
          templateTimelineVersion: {
            type: 'integer',
          },
          timelineType: {
            type: 'keyword',
          },
          dateRange: {
            properties: {
              start: {
                type: 'date',
              },
              end: {
                type: 'date',
              },
            },
          },
          sort: {
            dynamic: false,
            properties: {
              columnId: {
                type: 'keyword',
              },
              columnType: {
                type: 'keyword',
              },
              sortDirection: {
                type: 'keyword',
              },
            },
          },
          status: {
            type: 'keyword',
          },
          created: {
            type: 'date',
          },
          createdBy: {
            type: 'text',
          },
          updated: {
            type: 'date',
          },
          updatedBy: {
            type: 'text',
          },
        },
      },
      'endpoint:user-artifact-manifest': {
        properties: {
          created: {
            type: 'date',
            index: false,
          },
          schemaVersion: {
            type: 'keyword',
          },
          semanticVersion: {
            type: 'keyword',
            index: false,
          },
          artifacts: {
            type: 'nested',
            properties: {
              policyId: {
                type: 'keyword',
                index: false,
              },
              artifactId: {
                type: 'keyword',
                index: false,
              },
            },
          },
        },
      },
      'security-solution-signals-migration': {
        properties: {
          sourceIndex: {
            type: 'keyword',
          },
          destinationIndex: {
            type: 'keyword',
            index: false,
          },
          version: {
            type: 'long',
          },
          error: {
            type: 'text',
            index: false,
          },
          taskId: {
            type: 'keyword',
            index: false,
          },
          status: {
            type: 'keyword',
            index: false,
          },
          created: {
            type: 'date',
            index: false,
          },
          createdBy: {
            type: 'text',
            index: false,
          },
          updated: {
            type: 'date',
            index: false,
          },
          updatedBy: {
            type: 'text',
            index: false,
          },
        },
      },
      'infrastructure-ui-source': {
        dynamic: false,
        properties: {},
      },
      'metrics-explorer-view': {
        dynamic: false,
        properties: {},
      },
      'inventory-view': {
        dynamic: false,
        properties: {},
      },
      'infrastructure-monitoring-log-view': {
        dynamic: false,
        properties: {
          name: {
            type: 'text',
          },
        },
      },
      'upgrade-assistant-reindex-operation': {
        dynamic: false,
        properties: {
          indexName: {
            type: 'keyword',
          },
          status: {
            type: 'integer',
          },
        },
      },
      'upgrade-assistant-ml-upgrade-operation': {
        dynamic: false,
        properties: {
          snapshotId: {
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
      'monitoring-telemetry': {
        properties: {
          reportedClusterUuids: {
            type: 'keyword',
          },
        },
      },
      enterprise_search_telemetry: {
        dynamic: false,
        properties: {},
      },
      app_search_telemetry: {
        dynamic: false,
        properties: {},
      },
      workplace_search_telemetry: {
        dynamic: false,
        properties: {},
      },
      'apm-indices': {
        dynamic: false,
        properties: {},
      },
      'apm-telemetry': {
        dynamic: false,
        properties: {},
      },
      'apm-server-schema': {
        properties: {
          schemaJson: {
            type: 'text',
            index: false,
          },
        },
      },
      'apm-service-group': {
        properties: {
          groupName: {
            type: 'keyword',
          },
          kuery: {
            type: 'text',
          },
          description: {
            type: 'text',
          },
          color: {
            type: 'text',
          },
        },
      },
    },
  },
  '.kibana_task_manager': {
    typeMappings: {
      task: {
        properties: {
          taskType: {
            type: 'keyword',
          },
          scheduledAt: {
            type: 'date',
          },
          runAt: {
            type: 'date',
          },
          startedAt: {
            type: 'date',
          },
          retryAt: {
            type: 'date',
          },
          enabled: {
            type: 'boolean',
          },
          schedule: {
            properties: {
              interval: {
                type: 'keyword',
              },
            },
          },
          attempts: {
            type: 'integer',
          },
          status: {
            type: 'keyword',
          },
          traceparent: {
            type: 'text',
          },
          params: {
            type: 'text',
          },
          state: {
            type: 'text',
          },
          user: {
            type: 'keyword',
          },
          scope: {
            type: 'keyword',
          },
          ownerId: {
            type: 'keyword',
          },
        },
      },
    },
    script: 'ctx._id = ctx._source.type + \':\' + ctx._id; ctx._source.remove("kibana")',
  },
};
