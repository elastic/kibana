/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Workflow that prints received alerts (both aggregated and per-item).
 * Used as both the single-alert and multiple-alert target workflow
 * in the alert trigger integration test.
 */
export const getPrintAlertsWorkflowYaml = (name: string) => `
name: ${name}
enabled: true
description: Prints all received alerts
triggers:
 - type: manual
 - type: alert
steps:
 - name: log
   type: console
   foreach: \${{event.alerts}}
   with:
     message: \${{event}}
 - name: log_each_alert
   type: console
   foreach: \${{event.alerts}}
   with:
     message: \${{foreach.item}}
`;

/**
 * Workflow that creates a security detection rule with two workflow actions:
 * one in single-alert mode (summaryMode: false) and one in summary mode
 * (summaryMode: true). Takes the target workflow IDs as inputs.
 */
export const getCreateAlertRuleWorkflowYaml = (name: string) => `
name: ${name}
description: Create alert rule
enabled: true
triggers:
  - type: manual
inputs:
  - name: wf_multiple_alerts
    type: string
    required: true
  - name: wf_single_alert
    type: string
    required: true
consts:
  alerts_index_name: test-security-alerts-index
steps:
  - name: create_security_alert_rule
    type: kibana.request
    with:
      method: POST
      path: /s/\{{workflow.spaceId}}/api/detection_engine/rules
      body:
        type: query
        index:
          - test-security-alerts-index
        filters: []
        language: kuery
        query: "not severity: foo"
        required_fields: []
        author: []
        false_positives: []
        references: []
        risk_score: 21
        risk_score_mapping: []
        severity: low
        severity_mapping: []
        threat: []
        max_signals: 100
        name: Security alert test
        description: Security alert test
        tags: []
        setup: ""
        license: ""
        interval: 15s
        from: now-20s
        to: now
        actions:
          - id: system-connector-.workflows
            params:
              subAction: run
              subActionParams:
                workflowId: "{{inputs.wf_single_alert}}"
                summaryMode: false
            action_type_id: .workflows
            uuid: b8bc90a9-2112-41c4-a797-bb6cbb52f5da
          - id: system-connector-.workflows
            params:
              subAction: run
              subActionParams:
                workflowId: "{{inputs.wf_multiple_alerts}}"
                summaryMode: true
            action_type_id: .workflows
            uuid: b8bc90a9-2112-41c4-a797-bb6cbb52f5da
        enabled: true
`;

/**
 * Workflow that creates a timestamp ingest pipeline and indexes alert
 * documents, which triggers the security detection rule.
 */
export const getTriggerAlertWorkflowYaml = (name: string) => `
name: ${name}
description: Add timestamp ingest pipeline, ingest docs, which will trigger the alert
enabled: true
triggers:
  - type: manual
consts:
  pipeline_name: add_timestamp_if_missing
  alerts_index_name: test-security-alerts-index
inputs:
  type: object
  properties:
    alerts:
      type: array
      items:
        type: object
  required:
    - "alerts"
steps:
  - name: create_ingest_pipeline
    type: elasticsearch.request
    on-failure:
      continue: true
    with:
      method: PUT
      path: _ingest/pipeline/add_timestamp_if_missing
      body:
        processors:
          - set:
              if: ctx['@timestamp'] == null
              field: "@timestamp"
              value: "{% raw %}{{_ingest.timestamp}}{% endraw %}"
  - name: index
    type: elasticsearch.request
    foreach: "{{inputs.alerts}}"
    with:
      method: POST
      path: /{{consts.alerts_index_name}}/_doc?pipeline={{consts.pipeline_name}}
      body: \${{foreach.item}}
`;
