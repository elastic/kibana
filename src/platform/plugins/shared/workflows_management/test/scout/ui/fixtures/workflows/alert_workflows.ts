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

/** Prefix of the per-space indices holding alert trigger test documents. */
export const TEST_ALERTS_INDEX_PREFIX = 'test-workflow-alerts';

/** Index pattern covering every worker's test index, for granting ES privileges. */
export const TEST_ALERTS_INDEX_PATTERN = `${TEST_ALERTS_INDEX_PREFIX}-*`;

/**
 * Alert trigger tests run in parallel, one Kibana space per worker, so each
 * worker needs its own index — a shared one lets one worker's documents fire
 * another worker's rule and break exact execution-count assertions.
 */
export const getTestAlertsIndex = (spaceId: string) => `${TEST_ALERTS_INDEX_PREFIX}-${spaceId}`;

/**
 * `1m` is the smallest interval a rule may be scheduled at on a default
 * deployment (`xpack.alerting.rules.minimumScheduleInterval`, enforced on
 * serverless). Tests must not wait for this interval to elapse — they force a
 * run instead, which is why the lookback windows below are far wider than it.
 */
const RULE_INTERVAL = '1m';

/**
 * Lookback each rule queries on every run. Generous on purpose: a forced run
 * happens seconds after the documents are indexed, and both rule types
 * de-duplicate (detection rules on document `_id`, the ES|QL rule via
 * `excludeHitsFromPreviousRun`), so a wide window cannot double-alert.
 */
const RULE_LOOKBACK = '5m';

/**
 * Workflow that creates a security detection rule with two workflow actions:
 * one in single-alert mode (summaryMode: false) and one in summary mode
 * (summaryMode: true). Takes the target workflow IDs as inputs.
 *
 * Only works with the Security solution (uses the detection engine API).
 */
export const getCreateSecurityAlertRuleWorkflowYaml = (name: string, alertsIndex: string) => `
name: ${name}
description: Create security detection rule
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
  alerts_index_name: ${alertsIndex}
steps:
  - name: create_security_alert_rule
    type: kibana.request
    with:
      method: POST
      path: /s/{{workflow.spaceId}}/api/detection_engine/rules
      body:
        type: query
        index:
          - ${alertsIndex}
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
        interval: ${RULE_INTERVAL}
        from: now-${RULE_LOOKBACK}
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
 * Workflow that creates an ES|QL alert rule via the generic Kibana alerting API
 * with two workflow actions: one per-alert (summaryMode: false) and one summary
 * (summaryMode: true). Takes the target workflow IDs as inputs.
 *
 * Uses searchType: esqlQuery with groupBy: row so the rule creates one alert per
 * document — matching the security detection engine's per-document alert behavior.
 *
 * Works with Observability (and ESS) — uses the standard alerting framework
 * instead of the Security detection engine.
 *
 * Creates the index first because ES|QL `FROM` errors on a missing index, and
 * the rule runs once as soon as it is created. The index is never deleted here:
 * it is per-space and the test removes it on teardown.
 */
export const getCreateObsAlertRuleWorkflowYaml = (name: string, alertsIndex: string) => `
name: ${name}
description: Create ES|QL alert rule
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
  alerts_index_name: ${alertsIndex}
steps:
  - name: create_index
    type: elasticsearch.indices.create
    with:
      index: "{{consts.alerts_index_name}}"
    on-failure:
      continue: true
  - name: create_obs_alert_rule
    type: kibana.request
    with:
      method: POST
      path: /s/{{workflow.spaceId}}/api/alerting/rule
      body:
        name: ES|QL alert test
        rule_type_id: .es-query
        consumer: alerts
        params:
          searchType: esqlQuery
          esqlQuery:
            esql: "FROM {{consts.alerts_index_name}} METADATA _id | KEEP _id, severity, alert_id, description, category"
          timeWindowSize: 5
          timeWindowUnit: m
          threshold:
            - 0
          thresholdComparator: ">"
          size: 100
          aggType: count
          groupBy: row
          excludeHitsFromPreviousRun: true
          timeField: "@timestamp"
        schedule:
          interval: ${RULE_INTERVAL}
        actions:
          - id: system-connector-.workflows
            group: query matched
            params:
              subAction: run
              subActionParams:
                workflowId: "{{inputs.wf_single_alert}}"
                summaryMode: false
          - id: system-connector-.workflows
            group: query matched
            params:
              subAction: run
              subActionParams:
                workflowId: "{{inputs.wf_multiple_alerts}}"
                summaryMode: true
        tags: []
        alert_delay:
          active: 1
`;

/**
 * Workflow that creates a timestamp ingest pipeline and indexes alert
 * documents into the index the alert rule monitors.
 *
 * Indexes with `refresh=wait_for` so the documents are searchable by the time
 * the test forces the rule to run.
 */
export const getTriggerAlertWorkflowYaml = (name: string, alertsIndex: string) => `
name: ${name}
description: Add timestamp ingest pipeline, ingest docs, which will trigger the alert
enabled: true
triggers:
  - type: manual
    inputs:
      type: object
      properties:
        alerts:
          type: array
          items:
            type: object
      required:
        - "alerts"
consts:
  pipeline_name: add_timestamp_if_missing
  alerts_index_name: ${alertsIndex}

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
      path: /{{consts.alerts_index_name}}/_doc?pipeline={{consts.pipeline_name}}&refresh=wait_for
      body: \${{foreach.item}}
`;
