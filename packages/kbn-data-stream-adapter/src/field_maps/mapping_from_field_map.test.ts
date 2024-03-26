/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { alertFieldMap, legacyAlertFieldMap, type FieldMap } from '@kbn/alerts-as-data-utils';
import { mappingFromFieldMap } from './mapping_from_field_map';

export const testFieldMap: FieldMap = {
  date_field: {
    type: 'date',
    array: false,
    required: true,
  },
  keyword_field: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  long_field: {
    type: 'long',
    array: false,
    required: false,
  },
  multifield_field: {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
    multi_fields: [
      {
        flat_name: 'multifield_field.text',
        name: 'text',
        type: 'match_only_text',
      },
    ],
  },
  geopoint_field: {
    type: 'geo_point',
    array: false,
    required: false,
  },
  ip_field: {
    type: 'ip',
    array: false,
    required: false,
  },
  array_field: {
    type: 'keyword',
    array: true,
    required: false,
    ignore_above: 1024,
  },
  nested_array_field: {
    type: 'nested',
    array: false,
    required: false,
  },
  'nested_array_field.field1': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  'nested_array_field.field2': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  scaled_float_field: {
    type: 'scaled_float',
    array: false,
    required: false,
    scaling_factor: 1000,
  },
  constant_keyword_field: {
    type: 'constant_keyword',
    array: false,
    required: false,
  },
  'parent_field.child1': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  'parent_field.child2': {
    type: 'keyword',
    array: false,
    required: false,
    ignore_above: 1024,
  },
  unmapped_object: {
    type: 'object',
    required: false,
    enabled: false,
  },
  formatted_field: {
    type: 'date_range',
    required: false,
    format: 'epoch_millis||strict_date_optional_time',
  },
};
export const expectedTestMapping = {
  properties: {
    array_field: {
      ignore_above: 1024,
      type: 'keyword',
    },
    constant_keyword_field: {
      type: 'constant_keyword',
    },
    date_field: {
      type: 'date',
    },
    multifield_field: {
      fields: {
        text: {
          type: 'match_only_text',
        },
      },
      ignore_above: 1024,
      type: 'keyword',
    },
    geopoint_field: {
      type: 'geo_point',
    },
    ip_field: {
      type: 'ip',
    },
    keyword_field: {
      ignore_above: 1024,
      type: 'keyword',
    },
    long_field: {
      type: 'long',
    },
    nested_array_field: {
      properties: {
        field1: {
          ignore_above: 1024,
          type: 'keyword',
        },
        field2: {
          ignore_above: 1024,
          type: 'keyword',
        },
      },
      type: 'nested',
    },
    parent_field: {
      properties: {
        child1: {
          ignore_above: 1024,
          type: 'keyword',
        },
        child2: {
          ignore_above: 1024,
          type: 'keyword',
        },
      },
    },
    scaled_float_field: {
      scaling_factor: 1000,
      type: 'scaled_float',
    },
    unmapped_object: {
      enabled: false,
      type: 'object',
    },
    formatted_field: {
      type: 'date_range',
      format: 'epoch_millis||strict_date_optional_time',
    },
  },
};

describe('mappingFromFieldMap', () => {
  it('correctly creates mapping from field map', () => {
    expect(mappingFromFieldMap(testFieldMap)).toEqual({
      dynamic: 'strict',
      ...expectedTestMapping,
    });
    expect(mappingFromFieldMap(alertFieldMap)).toEqual({
      dynamic: 'strict',
      properties: {
        '@timestamp': {
          ignore_malformed: false,
          type: 'date',
        },
        event: {
          properties: {
            action: {
              type: 'keyword',
            },
            kind: {
              type: 'keyword',
            },
          },
        },
        kibana: {
          properties: {
            alert: {
              properties: {
                action_group: {
                  type: 'keyword',
                },
                case_ids: {
                  type: 'keyword',
                },
                consecutive_matches: {
                  type: 'long',
                },
                duration: {
                  properties: {
                    us: {
                      type: 'long',
                    },
                  },
                },
                end: {
                  type: 'date',
                },
                flapping: {
                  type: 'boolean',
                },
                flapping_history: {
                  type: 'boolean',
                },
                maintenance_window_ids: {
                  type: 'keyword',
                },
                instance: {
                  properties: {
                    id: {
                      type: 'keyword',
                    },
                  },
                },
                last_detected: {
                  type: 'date',
                },
                reason: {
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                  type: 'keyword',
                },
                rule: {
                  properties: {
                    category: {
                      type: 'keyword',
                    },
                    consumer: {
                      type: 'keyword',
                    },
                    execution: {
                      properties: {
                        uuid: {
                          type: 'keyword',
                        },
                      },
                    },
                    name: {
                      type: 'keyword',
                    },
                    parameters: {
                      type: 'flattened',
                      ignore_above: 4096,
                    },
                    producer: {
                      type: 'keyword',
                    },
                    revision: {
                      type: 'long',
                    },
                    rule_type_id: {
                      type: 'keyword',
                    },
                    tags: {
                      type: 'keyword',
                    },
                    uuid: {
                      type: 'keyword',
                    },
                  },
                },
                start: {
                  type: 'date',
                },
                status: {
                  type: 'keyword',
                },
                time_range: {
                  type: 'date_range',
                  format: 'epoch_millis||strict_date_optional_time',
                },
                url: {
                  ignore_above: 2048,
                  index: false,
                  type: 'keyword',
                },
                uuid: {
                  type: 'keyword',
                },
                workflow_assignee_ids: {
                  type: 'keyword',
                },
                workflow_status: {
                  type: 'keyword',
                },
                workflow_tags: {
                  type: 'keyword',
                },
              },
            },
            space_ids: {
              type: 'keyword',
            },
            version: {
              type: 'version',
            },
          },
        },
        tags: {
          type: 'keyword',
        },
      },
    });
    expect(mappingFromFieldMap(legacyAlertFieldMap)).toEqual({
      dynamic: 'strict',
      properties: {
        kibana: {
          properties: {
            alert: {
              properties: {
                risk_score: { type: 'float' },
                rule: {
                  properties: {
                    author: { type: 'keyword' },
                    created_at: { type: 'date' },
                    created_by: { type: 'keyword' },
                    description: { type: 'keyword' },
                    enabled: { type: 'keyword' },
                    from: { type: 'keyword' },
                    interval: { type: 'keyword' },
                    license: { type: 'keyword' },
                    note: { type: 'keyword' },
                    references: { type: 'keyword' },
                    rule_id: { type: 'keyword' },
                    rule_name_override: { type: 'keyword' },
                    to: { type: 'keyword' },
                    type: { type: 'keyword' },
                    updated_at: { type: 'date' },
                    updated_by: { type: 'keyword' },
                    version: { type: 'keyword' },
                  },
                },
                severity: { type: 'keyword' },
                suppression: {
                  properties: {
                    docs_count: { type: 'long' },
                    end: { type: 'date' },
                    terms: {
                      properties: { field: { type: 'keyword' }, value: { type: 'keyword' } },
                    },
                    start: { type: 'date' },
                  },
                },
                system_status: { type: 'keyword' },
                workflow_reason: { type: 'keyword' },
                workflow_status_updated_at: { type: 'date' },
                workflow_user: { type: 'keyword' },
              },
            },
          },
        },
        ecs: { properties: { version: { type: 'keyword' } } },
      },
    });
  });

  it('uses dynamic setting if specified', () => {
    expect(mappingFromFieldMap(testFieldMap, true)).toEqual({
      dynamic: true,
      ...expectedTestMapping,
    });
  });
});
