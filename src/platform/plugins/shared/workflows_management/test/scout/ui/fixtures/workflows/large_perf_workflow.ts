/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates a large workflow (~500 lines) with many template variables,
 * nested if/foreach blocks, and multiple step types — designed to maximally
 * stress the validation pipeline and create real jank in the editor.
 */
export const getLargePerfWorkflowYaml = () => {
  const steps: string[] = [];

  for (let i = 0; i < 30; i++) {
    steps.push(`  - name: http_step_${i}
    type: http
    with:
      url: "{{ consts.api_url }}/endpoint_${i}?q={{ steps.${
      i > 0 ? `http_step_${i - 1}` : 'choose_ioc'
    }.output | url_encode }}&key={{ consts.api_key }}"
      method: GET
      headers:
        Content-Type: application/json
        x-apikey: "{{ consts.api_key }}"
        x-request-id: "{{ inputs.request_id }}"
        x-session: "{{ consts.session_token }}"
      timeout: 30s`);
  }

  const ifBlocks: string[] = [];
  for (let i = 0; i < 5; i++) {
    const innerSteps = Array.from({ length: 4 }, (_, j) => {
      const idx = i * 4 + j;
      return `      - name: branch_${i}_step_${j}
        type: console
        with:
          message: |
            Processing branch ${i} step ${j}:
            Input: {{ inputs.message }}
            Previous: {{ steps.http_step_${idx % 30}.output }}
            Host: {{ consts.api_url }}
            Key: {{ consts.api_key }}
            Request: {{ inputs.request_id }}`;
    }).join('\n');

    ifBlocks.push(`  - name: branch_${i}
    type: if
    condition: 'steps.http_step_${i}.output: "match"'
    steps:
${innerSteps}
      - name: branch_${i}_foreach
        type: foreach
        foreach: "{{ steps.http_step_${i}.output }}"
        steps:
          - name: branch_${i}_foreach_process
            type: console
            with:
              message: "Processing {{ foreach.item }} from branch ${i}: {{ steps.http_step_${i}.output }}"
          - name: branch_${i}_foreach_update
            type: http
            with:
              url: "{{ consts.api_url }}/update/{{ foreach.item | url_encode }}"
              method: POST
              headers:
                Content-Type: application/json
                x-apikey: "{{ consts.api_key }}"
              body: |
                {
                  "item": "{{ foreach.item }}",
                  "source": "{{ steps.http_step_${i}.output }}",
                  "request_id": "{{ inputs.request_id }}",
                  "session": "{{ consts.session_token }}"
                }
              timeout: 30s`);
  }

  const aggregationSteps = Array.from({ length: 10 }, (_, i) => {
    const refs = Array.from(
      { length: 6 },
      (__, j) => `            Step ${j}: {{ steps.http_step_${(i * 3 + j) % 30}.output }}`
    ).join('\n');
    return `  - name: aggregate_${i}
    type: console
    with:
      message: |
        Aggregation ${i}:
        Input: {{ inputs.message }}
        Request: {{ inputs.request_id }}
        API URL: {{ consts.api_url }}
${refs}`;
  }).join('\n');

  return `version: "1"
name: Perf Stress Test Workflow
enabled: false
triggers:
  - type: manual
inputs:
  - name: message
    type: string
    default: "hello"
  - name: request_id
    type: string
    default: "req-001"
  - name: severity
    type: string
    default: "high"
  - name: category
    type: string
    default: "process"
consts:
  api_key: REDACTED
  api_url: https://example.com
  email_to: user@example.com
  session_token: SESSION_TOKEN
  org_id: ORG_123
steps:
  - name: choose_ioc
    type: console
    with:
      message: |
        {%- assign category = inputs.category -%}
        {%- if category contains "process" -%}
        {{- inputs.message | strip -}}
        {%- elsif category contains "file" -%}
        {{- inputs.severity | strip -}}
        {%- elsif category contains "network" -%}
        {{- inputs.request_id | strip -}}
        {%- else -%}
        {{- inputs.message | strip -}}
        {%- endif -%}
${steps.join('\n')}
${ifBlocks.join('\n')}
${aggregationSteps}
  - name: final_summary
    type: console
    with:
      message: |
        Final summary:
        IOC: {{ steps.choose_ioc.output }}
        Request: {{ inputs.request_id }}
        Severity: {{ inputs.severity }}
        Category: {{ inputs.category }}
        {%- for i in (0..29) -%}
        Step {{ i }}: done
        {%- endfor -%}
  - name: send_notification
    type: console
    with:
      message: "Sending to {{ consts.email_to }}: {{ steps.final_summary.output }}"
`;
};
