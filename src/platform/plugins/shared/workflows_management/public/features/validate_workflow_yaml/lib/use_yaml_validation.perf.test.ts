/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console, import/no-nodejs-modules, no-continue */

import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import YAML, { LineCounter, visit } from 'yaml';
import { DynamicStepContextSchema, WorkflowSchemaForAutocomplete } from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { collectAllConnectorIds } from './collect_all_connector_ids';
import { collectAllCustomPropertyItems } from './collect_all_custom_property_items';
import { collectAllStepNames } from './collect_all_step_names';
import { collectAllVariables } from './collect_all_variables';
import { validateConnectorIds } from './validate_connector_ids';
import { validateCustomProperties } from './validate_custom_properties';
import { validateIfConditions } from './validate_if_conditions';
import { validateJsonSchemaDefaults } from './validate_json_schema_defaults';
import { validateLiquidTemplate } from './validate_liquid_template';
import { validateStepNameUniqueness } from './validate_step_name_uniqueness';
import { validateTriggerConditions } from './validate_trigger_conditions';
import { validateVariable } from './validate_variable';
import { validateVariables } from './validate_variables';
import { validateWorkflowInputs } from './validate_workflow_inputs';
import { validateWorkflowOutputsInYaml } from './validate_workflow_outputs_in_yaml';
import { VARIABLE_REGEX_GLOBAL } from '../../../../common/lib/regex';
import {
  correctYamlSyntax,
  getPathAtOffset,
  getPathFromAncestors,
  parseWorkflowYamlForAutocomplete,
} from '../../../../common/lib/yaml';
import { getPropertyHandler } from '../../../../common/schema';
import { buildWorkflowLookup } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import { performComputation } from '../../../entities/workflows/store/workflow_detail/utils/computation';
import { getContextSchemaWithTemplateLocals } from '../../workflow_context/lib/extend_context_with_template_locals';
import {
  getContextSchemaForPath,
  getContextSchemaForStep,
} from '../../workflow_context/lib/get_context_for_path';
import { getNearestStepPath } from '../../workflow_context/lib/get_nearest_step_path';
import { getWorkflowContextSchema } from '../../workflow_context/lib/get_workflow_context_schema';

// Source: elastic/workflows — workflows/security/response/case-workflow-prod.yaml
// 81 {{ }} template references, 27 steps, nested if/foreach, Liquid control flow
const CASE_WORKFLOW_PROD_YAML = `version: "1"
name: Case workflow - Prod
enabled: true
triggers:
  - type: alert
consts:
    kibana_domain: REDACTED
    cyberbro_domain: REDACTED
    email_to_send_to: REDACTED
    ai_connector_id: REDACTED
    hash_ioc: REDACTED
    url_ioc: REDACTED
    vtkey: REDACTED
    web_query: REDACTED
steps:
  - name: choose-ioc-using-event-category
    type: console
    with:
      message: |2-
        {%- assign category = event.alerts[0].event.category -%}
        {%- if category contains "process" -%}
        {{-  event.alerts[0].process.hash.sha256 | strip -}}
        {%- elsif category contains "file" -%}
        {{- event.alerts[0].file.hash.sha256 | strip -}}
        {%- elsif category contains " dll" -%}
        {{- event.alerts[0].dll.hash.sha256 | strip -}}
        {%- elsif category contains " network" -%}
        {{- event.alerts[0].destination.ip | strip -}}
        {%- elsif category contains " network" and event.alerts[0].url.domain  -%}
        {{- event.alerts[0].url.domain | strip -}}
        {%- else -%}
        {{-  event.alerts[0].process.hash.sha256 | strip -}}
        {%- endif -%}
  - name: lookup-hash-via-vt
    type: http
    with:
      url: https://www.virustotal.com/api/v3/search?query={{steps.choose-ioc-using-event-category.output}}
      method: GET
      headers:
        Content-Type: application/json
        x-apikey: "{{ consts.vtkey }}"
      timeout: 30s
  - name: lookup-url-via-urlscan
    type: http
    with:
      url: https://urlscan.io/api/v1/search/?q=domain:{{steps.choose-ioc-using-event-category.output}}
      method: GET
      headers:
        Content-Type: application/json
      timeout: 30s
  - name: search-on-web
    type: http
    with:
      url: "https://leta.mullvad.net/search?q={{ steps.choose-ioc-using-event-category.output | url_encode}}&engine=google"
      method: GET
      headers:
          Accept: application/json
          Accept-Encoding: gzip
  - name: search_similair_cases_id-process
    type: elasticsearch.esql.query
    with:
      format: json
      query: FROM .kibana_alerting_cases* METADATA _id | WHERE cases.created_at > now() - 1h and cases.status == 0 or cases.status == 10  | WHERE (cases.title LIKE "*{{event.alerts[0].user.name}}*" and cases.title LIKE  "*{{event.alerts[0].process.name}}*") OR  (cases.title LIKE "*{{event.alerts[0].host.name}}*" and cases.title LIKE  "*{{event.alerts[0].user.name}}*") OR  (cases.title LIKE "*{{event.alerts[0].process.name}}*" and cases.title LIKE  "*{{event.alerts[0].host.name}}*") or (cases.description LIKE "*{{event.alerts[0].user.name}}*" and cases.description LIKE  "*{{event.alerts[0].source.ip}}*" and cases.description LIKE  "*{{event.alerts[0].destination.ip}}*") OR  (cases.description LIKE "*{{event.alerts[0].host.name}}*" and cases.description LIKE  "*{{event.alerts[0].source.ip}}*" and cases.description LIKE  "*{{event.alerts[0].destination.ip}}*") | SORT cases.created_at DESC | LIMIT 1 | EVAL case_id = REPLACE(_id, ".*:","")  | keep case_id
  - name: find_similar_case_id
    type: console
    with:
      message: |2-
        {%- assign category = event.alerts[0].event.category -%}
        {%- if category contains "process" -%}
        {{- steps.search_similair_cases_id-process.output.values[0] | strip -}}
        {%- elsif category contains "file" -%}
        {{- steps.search_similair_cases_id-process.output.values[0] | strip -}}
        {%- elsif category contains " network" -%}
        {{- steps.search_similair_cases_id-process.output.values[0] | strip -}}
        {%- else -%}
        {{- steps.search_similair_cases_id-process.output.values[0] | strip -}}
        {%- endif -%}
  - name: create_case_title
    type: console
    with:
      message: |2-
        {%- assign category = event.alerts[0].event.category -%}
        {%- if category contains "process" -%}
        {{event.alerts[0].signal.rule.name}} on {{event.alerts[0].host.name}} by {{event.alerts[0].user.name}} via {{event.alerts[0].process.name}}
        {%- elsif category contains "file" -%}
        {{event.alerts[0].signal.rule.name}} on {{event.alerts[0].host.name}} by {{event.alerts[0].user.name}} via {{event.alerts[0].process.name}} with file {{event.alerts[0].file.name}}
        {%- elsif category contains "dll" -%}
        {{event.alerts[0].signal.rule.name}} on {{event.alerts[0].host.name}} by {{event.alerts[0].user.name}} via {{event.alerts[0].process.name}} with dll {{event.alerts[0].dll.name}}
        {%- elsif category contains "network" -%}
        {{event.alerts[0].signal.rule.name}} with source: {{event.alerts[0].source.ip}} and destination:{{event.alerts[0].destination.ip}}
        {%- else -%}
        {{event.alerts[0].signal.rule.name}} on {{event.alerts[0].host.name}} by {{event.alerts[0].user.name}} via {{event.alerts[0].process.name}}
        {%- endif -%}
  - name: update_existing_case
    type: if
    condition: 'not steps.find_similar_case_id.output: ""'
    steps:
      - name: get_case_to_update
        type: kibana.getCaseDefaultSpace
        with:
          caseId: "{{steps.find_similar_case_id.output}}"
          fetcher:
            skip_ssl_verification: true
      - name: update_case_tag
        type: kibana.updateCaseDefaultSpace
        with:
          cases:
            - id: "{{steps.get_case_to_update.id}}"
              tags:
                - new-alert
                - automatic
              version: "{{steps.get_case_to_update.version}}"
              fetcher:
                skip_ssl_verification: true
      - name: loop_trough_alerts_to_update
        type: foreach
        foreach: "{{event.alerts | json}}"
        steps:
          - name: add_alert_to_case_update
            type: kibana.addCaseCommentDefaultSpace
            with:
              alertId: "{{foreach.item._id}}"
              index: .alerts-security.alerts-*
              owner: securitySolution
              rule:
                id: "{{foreach.item.signal.rule.id}}"
                name: "{{foreach.item.signal.rule.name}}"
              type: alert
              caseId: "{{steps.find_similar_case_id.output}}"
              fetcher:
                skip_ssl_verification: true
          - name: update_alert_statuss
            type: kibana.SetAlertsStatus
            with:
              status: "in-progress"
              signal_ids: ["{{foreach.item._id}}"]
              fetcher:
                skip_ssl_verification: true
  - name: create_new_case
    type: if
    condition: 'steps.find_similar_case_id.output: ""'
    steps:
      - name: esql_get_context_for_host
        type: elasticsearch.esql.query
        with:
          format: json
          query: FROM logs-* | WHERE host.name == "{{event.alerts[0].host.name}}" | keep host.os.type, host.os.version
      - name: esql_first_login_user
        type: elasticsearch.esql.query
        with:
          format: json
          query: FROM logs-system* | WHERE user.name == "{{event.alerts[0].user.name}}" | STATS first_login = MIN(@timestamp) | keep first_login
      - name: esql_get_context_for_user
        type: elasticsearch.esql.query
        with:
          format: json
          query: FROM logs-* | WHERE host.name == "{{event.alerts[0].user.name}}"
      - name: esql_get_alerts_by_host
        type: elasticsearch.esql.query
        with:
          format: json
          query: FROM .alerts-security.alerts-* | WHERE host.name == "{{event.alerts[0].host.name}}" | STATS triggers = COUNT(*), last_trigger = MAX(@timestamp) BY rule_name = kibana.alert.rule.name, host.name | SORT triggers DESC | KEEP last_trigger, triggers,rule_name, host.name
      - name: esql_get_alerts_by_user
        type: elasticsearch.esql.query
        with:
          format: json
          query: FROM .alerts-security.alerts-* | WHERE user.name == "{{event.alerts[0].user.name}}" | STATS triggers = COUNT(*), last_trigger = MAX(@timestamp) BY rule_name = kibana.alert.rule.name, user.name | SORT triggers DESC | KEEP last_trigger, triggers,rule_name, user.name
      - name: esql_get_cases_with_indicators
        type: elasticsearch.esql.query
        with:
          format: json
          query: FROM .kibana_alerting_cases* METADATA _id | WHERE (cases.description LIKE "*{{event.alerts[0].user.name}}*" and cases.description LIKE "*{{event.alerts[0].process.name}}*") or (cases.description LIKE "*{{event.alerts[0].host.name}}*" and cases.description LIKE "*{{event.alerts[0].process.name}}*") | EVAL case_id = REPLACE(_id, ".*:","") | keep cases.created_at, cases.title, case_id
      - name: kibana_createCaseDefaultSpace_step
        type: kibana.createCaseDefaultSpace
        with:
          connector:
            fields: null
            id: none
            name: none
            type: .none
          description: |
            > **What is the actual date of the alert:**
            signal.original_time: \`{{ event.alerts[0].signal.original_time | date: "%Y-%m-%d %H:%M:%S.%L", "Europe/Amsterdam" | default: "niet beschikbaar" }}\`
            >**Which hosts and users are involved in the alert:**
            {% if event.alerts[0].host.name %}
            host.name: \`{{event.alerts[0].host.name | default: "niet beschikbaar"}}\` van type: \`{{steps.esql_get_context_for_host.output.values[0] | default: "niet beschikbaar"}}\`
            {% endif %}
            {% if event.alerts[0].user.name %}
            user.name: \`{{event.alerts[0].user.name | default: "niet beschikbaar"}}\` met email: \`{{steps.esql_get_context_for_user.output.values[1] | default: "niet beschikbaar"}}\`
            {% endif %}
            >**Important IOC information**
            {% if steps.choose-ioc-using-event-category.output %}
            Virustotal malicious hits \`{{steps.lookup-hash-via-vt.output.data.data[0].attributes.last_analysis_stats.malicious | default: "niet beschikbaar"}}\`
            {% endif %}
            {% if event.alerts[0].process.command_line %}
            process.command_line: \`{{event.alerts[0].process.command_line | default: "niet beschikbaar"}}\`
            {% endif %}
            {% if event.alerts[0].file.hash.sha256 %}
            file.hash: \`{{event.alerts[0].file.hash.sha256 | default: "niet beschikbaar"}}\`
            {% endif %}
            {% if event.alerts[0].process.hash.sha256 %}
            process.hash: \`{{event.alerts[0].process.hash.sha256 | default: "niet beschikbaar"}}\`
            {% endif %}
            {% if event.alerts[0].source.ip %}
            source.ip: \`{{event.alerts[0].source.ip | default: "niet beschikbaar"}}\`
            {% endif %}
            {% if event.alerts[0].destination.ip %}
            destination.ip: \`{{event.alerts[0].destination.ip | default: "niet beschikbaar"}}\`
            {% endif %}
            {% for value in steps.esql_get_alerts_by_host.output.values %}
            {{ value[0] | date: "%Y-%m-%d %H:%M:%S.%L", "Europe/Amsterdam" | default: "niet beschikbaar" }}
            {% endfor %}
            >**Analysis**
                  AI Response {{steps.ask_ai_for_summary.output.data}}
            >**Conclusion**
          owner: securitySolution
          settings:
            syncAlerts: true
          severity: high
          tags:
            - Automatic
          title: "{{steps.create_case_title.output}}"
          fetcher:
            skip_ssl_verification: true
      - name: esql_get_case_id
        type: elasticsearch.esql.query
        with:
          format: json
          query: FROM .kibana_alerting_cases* METADATA _id | WHERE cases.title LIKE "{{steps.create_case_title.output}}" | LIMIT 1 | EVAL case_id = REPLACE(_id, ".*:","") | keep case_id
      - name: loop_over_results
        type: foreach
        foreach: "{{event.alerts | json}}"
        steps:
          - name: process-item
            type: console
            with:
              message: "{{foreach.item.id}}"
          - name: add_alert_to_case
            type: kibana.addCaseCommentDefaultSpace
            with:
              alertId: "{{foreach.item._id}}"
              index: .alerts-security.alerts-*
              owner: securitySolution
              rule:
                id: "{{foreach.item.signal.rule.id}}"
                name: "{{foreach.item.signal.rule.name}}"
              type: alert
              caseId: "{{steps.kibana_createCaseDefaultSpace_step.output.id}}"
              fetcher:
                skip_ssl_verification: true
          - name: update_alert_status
            type: kibana.SetAlertsStatus
            with:
              status: "in-progress"
              signal_ids: ["{{foreach.item._id}}"]
              fetcher:
                  skip_ssl_verification: true
      - name: email_step
        type: email
        connector-id: Gmail
        with:
          to:
            - "{{consts.email_to_send_to}}"
          subject: "{{steps.create_case_title.output}} [{{event.alerts[0].signal.rule.severity}}]"
          message: "{{steps.create_case_title.output}}"
`;

const ITERATIONS = 100;

function createMockModel(value: string) {
  const lines = value.split('\n');
  return {
    getValue: () => value,
    getPositionAt: (offset: number) => {
      let line = 1;
      let col = 1;
      for (let i = 0; i < offset && i < value.length; i++) {
        if (value[i] === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
      }
      return { lineNumber: line, column: col };
    },
    getOffsetAt: (pos: { lineNumber: number; column: number }) => {
      let offset = 0;
      for (let i = 1; i < pos.lineNumber && offset < value.length; i++) {
        const nextNewline = value.indexOf('\n', offset);
        if (nextNewline === -1) {
          break;
        }
        offset = nextNewline + 1;
      }
      return offset + pos.column - 1;
    },
    getLineMaxColumn: (lineNumber: number) => {
      const line = lines[lineNumber - 1];
      return line ? line.length + 1 : 1;
    },
    uri: { path: '/test.yaml' },
  } as any;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function benchmarkSync(fn: () => void): number {
  const samples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  return median(samples);
}

async function benchmarkAsync(fn: () => Promise<void>): Promise<number> {
  const samples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  return median(samples);
}

describe('YAML Validation Performance — Per-step Benchmarks', () => {
  const lineCounter = new LineCounter();
  const yamlDocument = YAML.parseDocument(CASE_WORKFLOW_PROD_YAML, {
    lineCounter,
    keepSourceTokens: true,
  });
  const mockModel = createMockModel(CASE_WORKFLOW_PROD_YAML);

  const computed = performComputation(CASE_WORKFLOW_PROD_YAML);
  const { workflowDefinition, workflowGraph, workflowLookup } = computed;

  it('measures each validation step independently', async () => {
    const timings: Record<string, number> = {};

    timings.validateStepNameUniqueness = benchmarkSync(() => {
      validateStepNameUniqueness(yamlDocument, lineCounter);
    });

    timings.validateLiquidTemplate = benchmarkSync(() => {
      validateLiquidTemplate(CASE_WORKFLOW_PROD_YAML, yamlDocument);
    });

    const connectorIdItems = collectAllConnectorIds(yamlDocument, lineCounter);
    timings.collectAllConnectorIds = benchmarkSync(() => {
      collectAllConnectorIds(yamlDocument, lineCounter);
    });

    timings.validateConnectorIds = benchmarkSync(() => {
      validateConnectorIds(connectorIdItems, null, '');
    });

    timings.validateWorkflowOutputsInYaml = benchmarkSync(() => {
      validateWorkflowOutputsInYaml(yamlDocument, mockModel, undefined);
    });

    if (workflowLookup) {
      timings.validateWorkflowInputs = benchmarkSync(() => {
        validateWorkflowInputs(workflowLookup, null, lineCounter);
      });

      timings.validateIfConditions = benchmarkSync(() => {
        validateIfConditions(workflowLookup, lineCounter);
      });

      timings.collectAllCustomPropertyItems = benchmarkSync(() => {
        collectAllCustomPropertyItems(
          workflowLookup,
          lineCounter,
          (stepType: string, scope: 'config' | 'input', key: string) =>
            getPropertyHandler(stepType, scope, key)
        );
      });
    }

    timings['validateCustomProperties (empty)'] = await benchmarkAsync(async () => {
      await validateCustomProperties([]);
    });

    if (workflowGraph && workflowDefinition) {
      timings.collectAllVariables = benchmarkSync(() => {
        collectAllVariables(mockModel, yamlDocument, workflowGraph);
      });

      const variableItems = collectAllVariables(mockModel, yamlDocument, workflowGraph);
      timings.validateVariables = benchmarkSync(() => {
        validateVariables(
          variableItems,
          workflowGraph,
          workflowDefinition,
          yamlDocument,
          mockModel
        );
      });

      timings.validateTriggerConditions = benchmarkSync(() => {
        validateTriggerConditions(workflowDefinition, yamlDocument);
      });

      timings.validateJsonSchemaDefaults = benchmarkSync(() => {
        validateJsonSchemaDefaults(yamlDocument, workflowDefinition, mockModel);
      });
    }

    console.log(`\n--- Per-step benchmark (median of ${ITERATIONS} iterations, ms) ---`);
    console.table(
      Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, Number(v.toFixed(3))]))
    );

    for (const [, ms] of Object.entries(timings)) {
      expect(ms).toBeLessThan(500);
    }
  });
});

describe('YAML Validation Performance — End-to-End', () => {
  it('measures the full validation pipeline', async () => {
    const timings: Record<string, number[]> = {};
    const record = (name: string, ms: number) => {
      if (!timings[name]) {
        timings[name] = [];
      }
      timings[name].push(ms);
    };

    for (let i = 0; i < ITERATIONS; i++) {
      const totalStart = performance.now();

      let start = performance.now();
      const computed = performComputation(CASE_WORKFLOW_PROD_YAML);
      record('performComputation', performance.now() - start);

      const {
        yamlDocument,
        yamlLineCounter: lc,
        workflowDefinition,
        workflowGraph,
        workflowLookup,
      } = computed;

      if (!yamlDocument || !lc) {
        continue;
      }

      const model = createMockModel(CASE_WORKFLOW_PROD_YAML);

      start = performance.now();
      validateStepNameUniqueness(yamlDocument, lc);
      record('validateStepNameUniqueness', performance.now() - start);

      start = performance.now();
      validateLiquidTemplate(CASE_WORKFLOW_PROD_YAML, yamlDocument);
      record('validateLiquidTemplate', performance.now() - start);

      start = performance.now();
      const connectorIdItems = collectAllConnectorIds(yamlDocument, lc);
      validateConnectorIds(connectorIdItems, null, '');
      record('connectorIds (collect+validate)', performance.now() - start);

      start = performance.now();
      validateWorkflowOutputsInYaml(yamlDocument, model, workflowDefinition?.outputs);
      record('validateWorkflowOutputsInYaml', performance.now() - start);

      if (workflowLookup && lc) {
        start = performance.now();
        const customPropertyItems = collectAllCustomPropertyItems(
          workflowLookup,
          lc,
          (stepType: string, scope: 'config' | 'input', key: string) =>
            getPropertyHandler(stepType, scope, key)
        );
        record('collectAllCustomPropertyItems', performance.now() - start);

        start = performance.now();
        await validateCustomProperties(customPropertyItems);
        record('validateCustomProperties', performance.now() - start);

        start = performance.now();
        validateWorkflowInputs(workflowLookup, null, lc);
        record('validateWorkflowInputs', performance.now() - start);

        start = performance.now();
        validateIfConditions(workflowLookup, lc);
        record('validateIfConditions', performance.now() - start);
      }

      if (workflowGraph && workflowDefinition) {
        start = performance.now();
        const variableItems = collectAllVariables(model, yamlDocument, workflowGraph);
        record('collectAllVariables', performance.now() - start);

        start = performance.now();
        validateVariables(variableItems, workflowGraph, workflowDefinition, yamlDocument, model);
        record('validateVariables', performance.now() - start);

        start = performance.now();
        validateTriggerConditions(workflowDefinition, yamlDocument);
        record('validateTriggerConditions', performance.now() - start);

        start = performance.now();
        validateJsonSchemaDefaults(yamlDocument, workflowDefinition, model);
        record('validateJsonSchemaDefaults', performance.now() - start);
      }

      record('total', performance.now() - totalStart);
    }

    const medians: Record<string, number> = {};
    for (const [name, samples] of Object.entries(timings)) {
      medians[name] = Number(median(samples).toFixed(3));
    }

    console.log(`\n--- End-to-end benchmark (median of ${ITERATIONS} iterations, ms) ---`);
    console.table(medians);

    expect(medians.total).toBeLessThan(2000);
    for (const [name, ms] of Object.entries(medians)) {
      if (name !== 'total') {
        expect(ms).toBeLessThan(500);
      }
    }
  });
});

describe('YAML Validation Performance — Hot-spot Breakdowns', () => {
  const lineCounter = new LineCounter();
  const yamlDocument = YAML.parseDocument(CASE_WORKFLOW_PROD_YAML, {
    lineCounter,
    keepSourceTokens: true,
  });
  const mockModel = createMockModel(CASE_WORKFLOW_PROD_YAML);
  const computed = performComputation(CASE_WORKFLOW_PROD_YAML);
  const { workflowDefinition, workflowGraph } = computed;

  it('breaks down validateStepNameUniqueness', () => {
    const timings: Record<string, number> = {};

    timings['collectAllStepNames (total)'] = benchmarkSync(() => {
      collectAllStepNames(yamlDocument, lineCounter);
    });

    // Isolate the visit() traversal cost vs. lineCounter.linePos cost
    timings['visit() traversal only'] = benchmarkSync(() => {
      visit(yamlDocument, {
        Scalar(_key, node) {
          if (node.range) {
            /* no-op */
          }
        },
      });
    });

    const stepNames = collectAllStepNames(yamlDocument, lineCounter);
    timings[`lineCounter.linePos (×${stepNames.length * 2})`] = benchmarkSync(() => {
      for (const stepName of stepNames) {
        lineCounter.linePos(stepName.node.range![0]);
        lineCounter.linePos(stepName.node.range![1]);
      }
    });

    // The dedup/error-creation part
    timings['dedup + error creation'] = benchmarkSync(() => {
      const stepNameCounts = new Map<string, typeof stepNames>();
      for (const stepInfo of stepNames) {
        const existing = stepNameCounts.get(stepInfo.name);
        if (existing) {
          existing.push(stepInfo);
        } else {
          stepNameCounts.set(stepInfo.name, [stepInfo]);
        }
      }
    });

    console.log(`\n--- validateStepNameUniqueness breakdown (median of ${ITERATIONS}, ms) ---`);
    console.table(
      Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, Number(v.toFixed(3))]))
    );
  });

  it('breaks down collectAllVariables (single-pass getScalarIndex)', () => {
    const timings: Record<string, number> = {};

    timings['collectAllVariables (total)'] = benchmarkSync(() => {
      collectAllVariables(mockModel, yamlDocument, workflowGraph!);
    });

    // getScalarIndex — single visit() that precomputes both ranges and paths
    // Cached via WeakMap, so force cold measurement with fresh document
    timings['getScalarIndex (visit + sort + paths, cold)'] = benchmarkSync(() => {
      const freshDoc = YAML.parseDocument(CASE_WORKFLOW_PROD_YAML, { keepSourceTokens: true });
      const entries: Array<{ start: number; end: number; path: Array<string | number> }> = [];
      visit(freshDoc, {
        Scalar(_k, node, ancestors) {
          if (node.range && node.value !== '') {
            entries.push({
              start: node.range[0],
              end: node.range[1],
              path: getPathFromAncestors(ancestors, node),
            });
          }
        },
      });
      entries.sort((a, b) => a.start - b.start);
    });

    const yamlString = mockModel.getValue();
    timings['VARIABLE_REGEX_GLOBAL matchAll'] = benchmarkSync(() => {
      Array.from(yamlString.matchAll(VARIABLE_REGEX_GLOBAL));
    });

    const matches: RegExpExecArray[] = Array.from(yamlString.matchAll(VARIABLE_REGEX_GLOBAL));
    timings[`model.getPositionAt (×${matches.length * 2})`] = benchmarkSync(() => {
      for (const match of matches) {
        const startOffset = match.index ?? 0;
        const endOffset = startOffset + match[0].length;
        mockModel.getPositionAt(startOffset);
        mockModel.getPositionAt(endOffset);
      }
    });

    // For reference: old per-variable getPathAtOffset cost
    timings[`OLD: getPathAtOffset per-var (×${matches.length})`] = benchmarkSync(() => {
      for (const match of matches) {
        getPathAtOffset(yamlDocument, match.index ?? 0);
      }
    });

    console.log(
      `\n--- collectAllVariables breakdown (single-pass, median of ${ITERATIONS}, ms) ---`
    );
    console.table(
      Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, Number(v.toFixed(3))]))
    );
  });

  it('breaks down validateVariables (with step schema cache)', () => {
    const timings: Record<string, number> = {};

    const variableItems = collectAllVariables(mockModel, yamlDocument, workflowGraph!);

    // Current implementation: computes baseSchema once, caches step schemas by name
    timings['validateVariables (total, with cache)'] = benchmarkSync(() => {
      validateVariables(
        variableItems,
        workflowGraph!,
        workflowDefinition!,
        yamlDocument,
        mockModel
      );
    });

    // For reference: old per-variable getContextSchemaForPath (no cache, rebuilds everything)
    timings['OLD: getContextSchemaForPath per-var (no cache)'] = benchmarkSync(() => {
      for (const item of variableItems) {
        try {
          getContextSchemaForPath(
            workflowDefinition!,
            workflowGraph!,
            item.yamlPath,
            yamlDocument,
            item.offset
          );
        } catch {
          /* ignore */
        }
      }
    });

    // ---- New implementation sub-steps ----

    // 1. baseSchema = DynamicStepContextSchema.merge(getWorkflowContextSchema(...)) — computed once
    timings['baseSchema (computed once)'] = benchmarkSync(() => {
      DynamicStepContextSchema.merge(getWorkflowContextSchema(workflowDefinition!, yamlDocument));
    });

    const baseSchema = DynamicStepContextSchema.merge(
      getWorkflowContextSchema(workflowDefinition!, yamlDocument)
    ) as typeof DynamicStepContextSchema;

    // 2. Unique step names resolved from variable paths
    const uniqueStepNames = new Set<string>();
    for (const item of variableItems) {
      const nearestStepPath = getNearestStepPath(item.yamlPath);
      if (nearestStepPath) {
        const nearestStep = _.get(workflowDefinition!, nearestStepPath) as
          | { name?: string }
          | undefined;
        if (nearestStep?.name) {
          uniqueStepNames.add(nearestStep.name);
        }
      }
    }

    // 3. getContextSchemaForStep — called only per unique step (cached)
    timings[`getContextSchemaForStep (×${uniqueStepNames.size} unique steps)`] = benchmarkSync(
      () => {
        for (const stepName of uniqueStepNames) {
          getContextSchemaForStep(baseSchema, workflowGraph!, stepName);
        }
      }
    );

    // 4. getContextSchemaWithTemplateLocals per variable (not cacheable — offset-dependent)
    timings[`getContextSchemaWithTemplateLocals (×${variableItems.length})`] = benchmarkSync(() => {
      for (const item of variableItems) {
        if (item.offset !== undefined) {
          getContextSchemaWithTemplateLocals(yamlDocument, item.offset, baseSchema);
        }
      }
    });

    // 5. validateVariable per variable
    const contexts = variableItems.map((item) => {
      try {
        return getContextSchemaForPath(
          workflowDefinition!,
          workflowGraph!,
          item.yamlPath,
          yamlDocument,
          item.offset
        );
      } catch {
        return null;
      }
    });
    timings[`validateVariable (×${variableItems.length})`] = benchmarkSync(() => {
      for (let i = 0; i < variableItems.length; i++) {
        validateVariable(variableItems[i], contexts[i]);
      }
    });

    console.log(
      `\n--- validateVariables breakdown (with step cache, median of ${ITERATIONS}, ms) ---`
    );
    console.table(
      Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, Number(v.toFixed(3))]))
    );
  });

  it('breaks down performComputation → parseWorkflowYamlForAutocomplete', () => {
    const timings: Record<string, number> = {};

    timings['performComputation (total)'] = benchmarkSync(() => {
      performComputation(CASE_WORKFLOW_PROD_YAML);
    });

    // ---- performComputation sub-steps ----
    timings['YAML.parseDocument'] = benchmarkSync(() => {
      const lc = new LineCounter();
      YAML.parseDocument(CASE_WORKFLOW_PROD_YAML, { lineCounter: lc, keepSourceTokens: true });
    });

    timings.correctYamlSyntax = benchmarkSync(() => {
      correctYamlSyntax(CASE_WORKFLOW_PROD_YAML);
    });

    const lc2 = new LineCounter();
    const doc2 = YAML.parseDocument(CASE_WORKFLOW_PROD_YAML, {
      lineCounter: lc2,
      keepSourceTokens: true,
    });
    timings.buildWorkflowLookup = benchmarkSync(() => {
      buildWorkflowLookup(doc2, lc2);
    });

    const correctedYaml = correctYamlSyntax(CASE_WORKFLOW_PROD_YAML);

    // ---- parseWorkflowYamlForAutocomplete deep breakdown ----
    timings['parseWorkflowYamlForAutocomplete (total)'] = benchmarkSync(() => {
      parseWorkflowYamlForAutocomplete(correctedYaml);
    });

    // Sub-step: parseYamlToJSONWithoutValidation (second YAML parse + toJSON)
    timings['  parseDocument (2nd parse)'] = benchmarkSync(() => {
      YAML.parseDocument(correctedYaml, { mapAsMap: true, maxAliasCount: 100 } as any);
    });

    const autocompleteDoc = YAML.parseDocument(correctedYaml, {
      mapAsMap: true,
      maxAliasCount: 100,
    } as any);
    timings['  doc.toJSON()'] = benchmarkSync(() => {
      autocompleteDoc.toJSON({ mapAsMap: false, maxAliasCount: 100 } as any);
    });

    // Sub-step: WorkflowSchemaForAutocomplete.safeParse (Zod validation)
    const json = autocompleteDoc.toJSON({ mapAsMap: false, maxAliasCount: 100 } as any);
    timings['  WorkflowSchemaForAutocomplete.safeParse'] = benchmarkSync(() => {
      WorkflowSchemaForAutocomplete.safeParse(json);
    });

    timings['WorkflowGraph.fromWorkflowDefinition'] = benchmarkSync(() => {
      WorkflowGraph.fromWorkflowDefinition(workflowDefinition!);
    });

    console.log(
      `\n--- performComputation → parseWorkflowYamlForAutocomplete breakdown (median of ${ITERATIONS}, ms) ---`
    );
    console.table(
      Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, Number(v.toFixed(3))]))
    );
  });
});

// ---------------------------------------------------------------------------
// Large workflow: infosec_demo.yaml (~1557 lines)
// ---------------------------------------------------------------------------
const LARGE_YAML_PATH = path.resolve(__dirname, '../../../../common/examples/infosec_demo.yaml');

describe('Large Workflow (infosec_demo.yaml)', () => {
  const LARGE_ITERATIONS = 20;
  let LARGE_YAML: string;

  beforeAll(() => {
    LARGE_YAML = fs.readFileSync(LARGE_YAML_PATH, 'utf-8');
  });

  function benchmarkSyncLarge(fn: () => void): number {
    const samples: number[] = [];
    for (let i = 0; i < LARGE_ITERATIONS; i++) {
      const start = performance.now();
      fn();
      samples.push(performance.now() - start);
    }
    return median(samples);
  }

  async function benchmarkAsyncLarge(fn: () => Promise<void>): Promise<number> {
    const samples: number[] = [];
    for (let i = 0; i < LARGE_ITERATIONS; i++) {
      const start = performance.now();
      await fn();
      samples.push(performance.now() - start);
    }
    return median(samples);
  }

  it('per-step benchmarks', async () => {
    const lineCounter = new LineCounter();
    const yamlDocument = YAML.parseDocument(LARGE_YAML, {
      lineCounter,
      keepSourceTokens: true,
    });
    const mockModel = createMockModel(LARGE_YAML);
    const computed = performComputation(LARGE_YAML);
    const { workflowDefinition, workflowGraph, workflowLookup } = computed;

    const timings: Record<string, number> = {};

    timings.validateStepNameUniqueness = benchmarkSyncLarge(() => {
      validateStepNameUniqueness(yamlDocument, lineCounter);
    });

    timings.validateLiquidTemplate = benchmarkSyncLarge(() => {
      validateLiquidTemplate(LARGE_YAML, yamlDocument);
    });

    timings.collectAllConnectorIds = benchmarkSyncLarge(() => {
      collectAllConnectorIds(yamlDocument, lineCounter);
    });

    const connectorIdItems = collectAllConnectorIds(yamlDocument, lineCounter);
    timings.validateConnectorIds = benchmarkSyncLarge(() => {
      validateConnectorIds(connectorIdItems, null, '');
    });

    timings.validateWorkflowOutputsInYaml = benchmarkSyncLarge(() => {
      validateWorkflowOutputsInYaml(yamlDocument, mockModel, undefined);
    });

    if (workflowLookup) {
      timings.validateWorkflowInputs = benchmarkSyncLarge(() => {
        validateWorkflowInputs(workflowLookup, null, lineCounter);
      });

      timings.validateIfConditions = benchmarkSyncLarge(() => {
        validateIfConditions(workflowLookup, lineCounter);
      });

      timings.collectAllCustomPropertyItems = benchmarkSyncLarge(() => {
        collectAllCustomPropertyItems(
          workflowLookup,
          lineCounter,
          (stepType: string, scope: 'config' | 'input', key: string) =>
            getPropertyHandler(stepType, scope, key)
        );
      });
    }

    timings['validateCustomProperties (empty)'] = await benchmarkAsyncLarge(async () => {
      await validateCustomProperties([]);
    });

    if (workflowGraph && workflowDefinition) {
      timings.collectAllVariables = benchmarkSyncLarge(() => {
        collectAllVariables(mockModel, yamlDocument, workflowGraph);
      });

      const variableItems = collectAllVariables(mockModel, yamlDocument, workflowGraph);
      timings[`validateVariables (${variableItems.length} vars)`] = benchmarkSyncLarge(() => {
        validateVariables(
          variableItems,
          workflowGraph,
          workflowDefinition,
          yamlDocument,
          mockModel
        );
      });

      timings.validateTriggerConditions = benchmarkSyncLarge(() => {
        validateTriggerConditions(workflowDefinition, yamlDocument);
      });

      timings.validateJsonSchemaDefaults = benchmarkSyncLarge(() => {
        validateJsonSchemaDefaults(yamlDocument, workflowDefinition, mockModel);
      });
    }

    const yamlLines = LARGE_YAML.split('\n').length;
    const varCount = Array.from(LARGE_YAML.matchAll(VARIABLE_REGEX_GLOBAL)).length;
    console.log(
      `\n--- Large workflow per-step benchmark (${yamlLines} lines, ${varCount} vars, median of ${LARGE_ITERATIONS}, ms) ---`
    );
    console.table(
      Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, Number(v.toFixed(3))]))
    );

    for (const [, ms] of Object.entries(timings)) {
      expect(ms).toBeLessThan(5000);
    }
  });

  it('end-to-end pipeline', async () => {
    const timings: Record<string, number[]> = {};
    const record = (name: string, ms: number) => {
      if (!timings[name]) {
        timings[name] = [];
      }
      timings[name].push(ms);
    };

    for (let i = 0; i < LARGE_ITERATIONS; i++) {
      const totalStart = performance.now();

      let start = performance.now();
      const computed = performComputation(LARGE_YAML);
      record('performComputation', performance.now() - start);

      const {
        yamlDocument,
        yamlLineCounter: lc,
        workflowDefinition,
        workflowGraph,
        workflowLookup,
      } = computed;
      if (!yamlDocument || !lc) {
        continue;
      }

      const model = createMockModel(LARGE_YAML);

      start = performance.now();
      validateStepNameUniqueness(yamlDocument, lc);
      record('validateStepNameUniqueness', performance.now() - start);

      start = performance.now();
      validateLiquidTemplate(LARGE_YAML, yamlDocument);
      record('validateLiquidTemplate', performance.now() - start);

      start = performance.now();
      const connectorIdItems = collectAllConnectorIds(yamlDocument, lc);
      validateConnectorIds(connectorIdItems, null, '');
      record('connectorIds (collect+validate)', performance.now() - start);

      start = performance.now();
      validateWorkflowOutputsInYaml(yamlDocument, model, workflowDefinition?.outputs);
      record('validateWorkflowOutputsInYaml', performance.now() - start);

      if (workflowLookup && lc) {
        start = performance.now();
        const customPropertyItems = collectAllCustomPropertyItems(
          workflowLookup,
          lc,
          (stepType: string, scope: 'config' | 'input', key: string) =>
            getPropertyHandler(stepType, scope, key)
        );
        record('collectAllCustomPropertyItems', performance.now() - start);

        start = performance.now();
        await validateCustomProperties(customPropertyItems);
        record('validateCustomProperties', performance.now() - start);

        start = performance.now();
        validateWorkflowInputs(workflowLookup, null, lc);
        record('validateWorkflowInputs', performance.now() - start);

        start = performance.now();
        validateIfConditions(workflowLookup, lc);
        record('validateIfConditions', performance.now() - start);
      }

      if (workflowGraph && workflowDefinition) {
        start = performance.now();
        const variableItems = collectAllVariables(model, yamlDocument, workflowGraph);
        record('collectAllVariables', performance.now() - start);

        start = performance.now();
        validateVariables(variableItems, workflowGraph, workflowDefinition, yamlDocument, model);
        record('validateVariables', performance.now() - start);

        start = performance.now();
        validateTriggerConditions(workflowDefinition, yamlDocument);
        record('validateTriggerConditions', performance.now() - start);

        start = performance.now();
        validateJsonSchemaDefaults(yamlDocument, workflowDefinition, model);
        record('validateJsonSchemaDefaults', performance.now() - start);
      }

      record('total', performance.now() - totalStart);
    }

    const medians: Record<string, number> = {};
    for (const [name, samples] of Object.entries(timings)) {
      medians[name] = Number(median(samples).toFixed(3));
    }

    console.log(`\n--- Large workflow end-to-end (median of ${LARGE_ITERATIONS}, ms) ---`);
    console.table(medians);

    expect(medians.total).toBeLessThan(10000);
  });

  it('hot-spot breakdowns', () => {
    const lineCounter = new LineCounter();
    const yamlDocument = YAML.parseDocument(LARGE_YAML, {
      lineCounter,
      keepSourceTokens: true,
    });
    const mockModel = createMockModel(LARGE_YAML);
    const computed = performComputation(LARGE_YAML);
    const { workflowDefinition, workflowGraph } = computed;
    const varMatches = Array.from(LARGE_YAML.matchAll(VARIABLE_REGEX_GLOBAL));

    const timings: Record<string, number> = {};

    // --- collectAllStepNames breakdown ---
    timings.collectAllStepNames = benchmarkSyncLarge(() => {
      collectAllStepNames(yamlDocument, lineCounter);
    });
    timings['  toString()'] = benchmarkSyncLarge(() => {
      yamlDocument.toString();
    });

    // --- collectAllVariables: new single-pass vs old per-variable ---
    timings['collectAllVariables NEW (single-pass getScalarIndex)'] = benchmarkSyncLarge(() => {
      collectAllVariables(mockModel, yamlDocument, workflowGraph!);
    });
    timings[`OLD: getPathAtOffset per-var (×${varMatches.length})`] = benchmarkSyncLarge(() => {
      for (const match of varMatches) {
        getPathAtOffset(yamlDocument, match.index ?? 0);
      }
    });
    // Single-pass index build (cold, with path computation)
    timings['  getScalarIndex (single visit, cold)'] = benchmarkSyncLarge(() => {
      const freshDoc = YAML.parseDocument(LARGE_YAML, { keepSourceTokens: true });
      const entries: Array<{ start: number; end: number; path: Array<string | number> }> = [];
      visit(freshDoc, {
        Scalar(_k, node, ancestors) {
          if (node.range && node.value !== '') {
            entries.push({
              start: node.range[0],
              end: node.range[1],
              path: getPathFromAncestors(ancestors, node),
            });
          }
        },
      });
      entries.sort((a, b) => a.start - b.start);
    });

    // --- validateVariables: new cached vs old uncached ---
    if (workflowGraph && workflowDefinition) {
      const variableItems = collectAllVariables(mockModel, yamlDocument, workflowGraph);

      timings[`validateVariables NEW (with cache, ${variableItems.length} vars)`] =
        benchmarkSyncLarge(() => {
          validateVariables(
            variableItems,
            workflowGraph,
            workflowDefinition,
            yamlDocument,
            mockModel
          );
        });

      timings[`OLD: getContextSchemaForPath per-var (×${variableItems.length})`] =
        benchmarkSyncLarge(() => {
          for (const item of variableItems) {
            try {
              getContextSchemaForPath(
                workflowDefinition,
                workflowGraph,
                item.yamlPath,
                yamlDocument,
                item.offset
              );
            } catch {
              /* ignore */
            }
          }
        });

      // Sub-step: baseSchema computed once
      timings['  baseSchema (computed once)'] = benchmarkSyncLarge(() => {
        DynamicStepContextSchema.merge(getWorkflowContextSchema(workflowDefinition, yamlDocument));
      });

      const baseSchema = DynamicStepContextSchema.merge(
        getWorkflowContextSchema(workflowDefinition, yamlDocument)
      ) as typeof DynamicStepContextSchema;

      const uniqueStepNames = new Set<string>();
      for (const item of variableItems) {
        const nearestStepPath = getNearestStepPath(item.yamlPath);
        if (nearestStepPath) {
          const nearestStep = _.get(workflowDefinition, nearestStepPath) as
            | { name?: string }
            | undefined;
          if (nearestStep?.name) {
            uniqueStepNames.add(nearestStep.name);
          }
        }
      }

      timings[`  getContextSchemaForStep (×${uniqueStepNames.size} unique steps)`] =
        benchmarkSyncLarge(() => {
          for (const stepName of uniqueStepNames) {
            getContextSchemaForStep(baseSchema, workflowGraph, stepName);
          }
        });

      timings[`  getContextSchemaWithTemplateLocals (×${variableItems.length})`] =
        benchmarkSyncLarge(() => {
          for (const item of variableItems) {
            if (item.offset !== undefined) {
              getContextSchemaWithTemplateLocals(yamlDocument, item.offset, baseSchema);
            }
          }
        });
    }

    // --- performComputation breakdown ---
    timings.performComputation = benchmarkSyncLarge(() => {
      performComputation(LARGE_YAML);
    });
    timings['  YAML.parseDocument'] = benchmarkSyncLarge(() => {
      const lc = new LineCounter();
      YAML.parseDocument(LARGE_YAML, { lineCounter: lc, keepSourceTokens: true });
    });
    const correctedYaml = correctYamlSyntax(LARGE_YAML);
    timings['  parseWorkflowYamlForAutocomplete'] = benchmarkSyncLarge(() => {
      parseWorkflowYamlForAutocomplete(correctedYaml);
    });
    timings['    parseDocument (2nd, mapAsMap)'] = benchmarkSyncLarge(() => {
      YAML.parseDocument(correctedYaml, { mapAsMap: true, maxAliasCount: 100 } as any);
    });
    const autocompleteDoc = YAML.parseDocument(correctedYaml, {
      mapAsMap: true,
      maxAliasCount: 100,
    } as any);
    timings['    doc.toJSON()'] = benchmarkSyncLarge(() => {
      autocompleteDoc.toJSON({ mapAsMap: false, maxAliasCount: 100 } as any);
    });
    const json = autocompleteDoc.toJSON({ mapAsMap: false, maxAliasCount: 100 } as any);
    timings['    WorkflowSchemaForAutocomplete.safeParse'] = benchmarkSyncLarge(() => {
      WorkflowSchemaForAutocomplete.safeParse(json);
    });

    const yamlLines = LARGE_YAML.split('\n').length;
    console.log(
      `\n--- Large workflow hot-spot breakdowns (${yamlLines} lines, ${varMatches.length} vars, median of ${LARGE_ITERATIONS}, ms) ---`
    );
    console.table(
      Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, Number(v.toFixed(3))]))
    );
  });
});
