/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../types';

export const ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID =
  'system-attack-discovery-alert-retrieval';
export const ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID = 'system-attack-discovery-generation';
export const ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID = 'system-attack-discovery-validate';
export const ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID = 'system-attack-discovery-run-example';
export const ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID =
  'system-attack-discovery-custom-validation-example';

const MANAGEMENT = {
  enablement: 'enforced',
  lifecycle: 'static',
  versionStrategy: 'auto',
} as const;

export const ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW = {
  id: ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 1,
  yaml: `version: '1'
name: Security - Attack discovery - Default alert retrieval
description: |
  Retrieves alerts for Attack Discovery analysis via custom queries, or ES|QL.
  This is the DEFAULT alert retrieval workflow - for custom alert retrieval, create your own workflow.
enabled: true
tags:
  - Attack discovery
  - Security
  - attackDiscovery:default_alert_retrieval

triggers:
  - type: manual

inputs:
  additionalProperties: false
  properties:
    alerts_index_pattern:
      description: >
        Elasticsearch index pattern for security alerts. When not provided,
        defaults to .alerts-security.alerts-<spaceId> using the current
        Kibana space (via workflow.spaceId).
      type: string
    anonymization_fields:
      description: Fields to anonymize
      items:
        additionalProperties: true
        type: object
      type: array
    api_config:
      additionalProperties: false
      description: LLM API configuration
      properties:
        action_type_id:
          type: string
        connector_id:
          type: string
        model:
          type: string
      required:
        - connector_id
      type: object
    end:
      description: Time range end
      type: string
    esql_query:
      description: >
        Optional ES|QL query for alert retrieval. When provided, overrides the
        default DSL-based retrieval and executes this ES|QL query instead.
      type: string
    filter:
      additionalProperties: true
      description: Query filter for alerts
      type: object
    replacements:
      additionalProperties: true
      description: Existing anonymization replacements to use
      type: object
    size:
      default: 150
      description: Maximum alerts to retrieve
      type: integer
    start:
      description: Time range start
      type: string
  required:
    - anonymization_fields
    - api_config

steps:
  - name: retrieve_alerts
    type: security.attack-discovery.defaultAlertRetrieval
    timeout: '5m'
    with:
      alerts_index_pattern: '{%- if inputs.alerts_index_pattern -%}{{ inputs.alerts_index_pattern }}{%- else -%}.alerts-security.alerts-{{ workflow.spaceId }}{%- endif -%}'
      anonymization_fields: \${{ inputs.anonymization_fields }}
      api_config: \${{ inputs.api_config }}
      end: \${{ inputs.end }}
      esql_query: \${{ inputs.esql_query }}
      filter: \${{ inputs.filter }}
      replacements: \${{ inputs.replacements }}
      size: \${{ inputs.size }}
      start: \${{ inputs.start }}`,
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_GENERATION_WORKFLOW = {
  id: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 1,
  yaml: `version: '1'
name: Security - Attack discovery - Generation
description: |
  Generates Attack discoveries from the provided context. This workflow is for
  Generation only; (no Alert retrieval or validation steps are executed)
enabled: true
tags:
  - Attack discovery
  - Security
  - attackDiscovery:generation

triggers:
  - type: manual

inputs:
  additionalProperties: false
  properties:
    additional_context:
      description: |
        Optional free-form text appended to the LLM generation prompt.
        Use this to provide extra context, constraints, or focus areas
        that the model should consider when analysing alerts.
      type: string
    additional_alerts:
      default: []
      description: |
        Pre-retrieved alerts passed from the pipeline endpoint.
        The pipeline endpoint runs retrieval workflows separately
        and passes the results here for generation.
      items:
        type: string
      type: array
    alert_retrieval_workflow_ids:
      default: []
      description: |
        Array of custom alert retrieval workflow IDs to execute.
        This array is read but not acted upon by this workflow.
        The pipeline endpoint handles retrieval orchestration.
      items:
        type: string
      type: array
    alerts_index_pattern:
      description: >
        Elasticsearch index pattern for security alerts. When not provided,
        defaults to .alerts-security.alerts-<spaceId> using the current
        Kibana space (via workflow.spaceId).
      type: string
    anonymization_fields:
      description: Fields to anonymize before sending to LLM
      items:
        additionalProperties: true
        type: object
      type: array
    api_config:
      additionalProperties: false
      description: LLM API configuration
      properties:
        action_type_id:
          type: string
        connector_id:
          type: string
        model:
          type: string
      required:
        - connector_id
      type: object
    connector_name:
      description: Human-readable name of the connector (defaults to connector_id if not provided)
      type: string
    end:
      description: Time range end (e.g., "now")
      type: string
    filter:
      additionalProperties: true
      description: Elasticsearch query filter
      type: object
    alert_retrieval_mode:
      default: 'custom_query'
      description: |
        Controls how the built-in default alert retrieval workflow operates.
        Values: 'custom_query' (DSL-based), 'esql' (ES|QL query), 'custom_only' (skip built-in retrieval),
        'provided' (alerts supplied directly via the \`alerts\` input; retrieval is skipped).
        This field is read but not acted upon by this workflow.
        The _generate endpoint handles retrieval orchestration.
      type: string
      enum: ['custom_only', 'custom_query', 'esql', 'provided']
    esql_query:
      description: |
        ES|QL query for alert retrieval (required when alert_retrieval_mode is 'esql').
      type: string
    validation_workflow_id:
      default: 'default'
      description: |
        ID of the validation workflow to use, or "default" for built-in validation.
        This ID is read but not acted upon by this workflow.
        The _generate endpoint handles validation orchestration.
      type: string
    replacements:
      additionalProperties: true
      description: Initial anonymization replacements
      type: object
    size:
      default: 150
      description: Maximum number of alerts to retrieve
      type: integer
    start:
      description: Time range start (e.g., "now-24h")
      type: string
  required:
    - api_config

steps:
  - name: generate_discoveries
    type: security.attack-discovery.generate
    timeout: '10m'
    with:
      additional_context: \${{ inputs.additional_context }}
      alerts: \${{ inputs.additional_alerts }}
      api_config: \${{ inputs.api_config }}
      replacements: \${{ inputs.replacements }}
      type: attack_discovery
  # Validation is handled outside this workflow by the _generate endpoint,
  # which invokes the alert retrieval, generation, and validation workflows sequentially.`,
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_VALIDATE_WORKFLOW = {
  id: ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 2,
  yaml: `version: '1'
name: Security - Attack discovery - Default validation
description: >
  Validates generated attack discoveries by filtering hallucinated alert IDs,
  then persists deduplicated discoveries
enabled: true
tags:
  - Attack discovery
  - Security
  - attackDiscovery:validate

triggers:
  - type: manual

inputs:
  additionalProperties: false
  properties:
    alerts_context_count:
      description: Number of alerts analyzed
      type: integer
    alerts_index_pattern:
      description: >
        Elasticsearch index pattern for security alerts. When not provided,
        defaults to .alerts-security.alerts-<spaceId> using the current
        Kibana space (via workflow.spaceId).
      type: string
    anonymized_alerts:
      description: Anonymized alerts in Document format
      items:
        additionalProperties: true
        type: object
      type: array
    api_config:
      additionalProperties: false
      description: LLM API configuration
      properties:
        action_type_id:
          type: string
        connector_id:
          type: string
        model:
          type: string
      required:
        - connector_id
      type: object
    attack_discoveries:
      description: Attack discoveries to validate
      items:
        additionalProperties: true
        type: object
      type: array
    connector_name:
      description: LLM connector name
      type: string
    enable_field_rendering:
      default: true
      description: Enable field rendering in UI
      type: boolean
    generation_uuid:
      description: Generation execution UUID for tracking
      type: string
    replacements:
      additionalProperties: true
      description: Anonymization replacements
      type: object
    source:
      description: How the generation was triggered (interactive, scheduled, or action)
      enum:
        - action
        - interactive
        - scheduled
      type: string
    with_replacements:
      default: false
      description: Include replacements in response
      type: boolean
  required:
    - alerts_context_count
    - anonymized_alerts
    - api_config
    - attack_discoveries
    - generation_uuid

steps:
  # Step 1: Filter hallucinated alert IDs and deduplicate discoveries
  - name: validate_discoveries
    type: security.attack-discovery.defaultValidation
    timeout: '5m'
    with:
      alerts_context_count: \${{ inputs.alerts_context_count }}
      alerts_index_pattern: '{%- if inputs.alerts_index_pattern -%}{{ inputs.alerts_index_pattern }}{%- else -%}.alerts-security.alerts-{{ workflow.spaceId }}{%- endif -%}'
      anonymized_alerts: \${{ inputs.anonymized_alerts }}
      api_config: \${{ inputs.api_config }}
      attack_discoveries: \${{ inputs.attack_discoveries }}
      connector_name: \${{ inputs.connector_name }}
      generation_uuid: \${{ inputs.generation_uuid }}
      replacements: \${{ inputs.replacements }}

  # Step 2: Persist validated discoveries to the Elasticsearch index
  - name: persist_discoveries
    type: security.attack-discovery.persistDiscoveries
    timeout: '5m'
    with:
      alerts_context_count: \${{ inputs.alerts_context_count }}
      anonymized_alerts: \${{ inputs.anonymized_alerts }}
      api_config: \${{ inputs.api_config }}
      attack_discoveries: \${{ steps.validate_discoveries.output.validated_discoveries }}
      connector_name: \${{ inputs.connector_name }}
      enable_field_rendering: \${{ inputs.enable_field_rendering }}
      generation_uuid: \${{ inputs.generation_uuid }}
      replacements: \${{ inputs.replacements }}
      source: \${{ inputs.source }}
      with_replacements: \${{ inputs.with_replacements }}`,
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW = {
  id: ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 2,
  yaml: `version: '1'
name: Security - Attack discovery - Run example
description: |
  Demonstrates the security.attack-discovery.run step, which orchestrates the
  full Attack Discovery pipeline (alert retrieval → generation → validation →
  persistence) in a single step. All inputs are optional: when \`connector_id\`
  is omitted, the server resolves the configured default AI connector
  (\`genAiSettings:defaultAIConnector\`, with an inference default-connector
  fallback). Provide \`connector_id\` to override the configured default.

  ## Modes of execution

  ### 1. All defaults (custom_query)
  Retrieves the 100 most recent security alerts and generates discoveries using
  the configured default AI connector.
  \`\`\`json
  {}
  \`\`\`

  ### 2. custom_query with overrides
  Scope retrieval to a specific time range, alert count, and DSL filter. Pass
  \`connector_id\` to override the configured default connector.
  \`\`\`json
  {
    "connector_id": "<your-connector-id>",
    "alert_retrieval_mode": "custom_query",
    "size": 25,
    "start": "now-72h",
    "end": "now",
    "filter": { "term": { "kibana.alert.severity": "critical" } }
  }
  \`\`\`

  ### 3. ES|QL retrieval
  Retrieve alerts via an ES|QL query instead of DSL.
  \`\`\`json
  {
    "alert_retrieval_mode": "esql",
    "esql_query": "FROM .alerts-security.alerts-default | WHERE kibana.alert.severity == \\"critical\\" | LIMIT 50"
  }
  \`\`\`

  ### 4. Pre-retrieved alerts (provided)
  Pass alerts directly — retrieval is skipped automatically when \`alerts\` is
  non-empty. This is the primary composability pattern: an upstream step or
  detection rule populates \`alerts\`; this step generates discoveries without
  re-querying Elasticsearch.
  \`\`\`json
  {
    "alerts": [
      "Alert 1: Unusual process execution on host web-prod-01. Process: cmd.exe spawned by iis.exe.",
      "Alert 2: Lateral movement detected. User admin logged in from 10.0.0.5 to 10.0.0.23 via PsExec.",
      "Alert 3: Privilege escalation attempt. User admin added to Domain Admins group."
    ]
  }
  \`\`\`

  ### 5. Async mode
  Fire the pipeline without waiting. Returns \`execution_uuid\` immediately;
  discoveries are written to Elasticsearch in the background. Can be combined
  with any retrieval mode by adding the relevant inputs alongside \`"mode": "async"\`.
  \`\`\`json
  { "mode": "async" }
  \`\`\`
enabled: true
tags:
  - Attack discovery
  - Security
  - Example
  - attackDiscovery:run_example

triggers:
  - type: manual

inputs:
  additionalProperties: false
  properties:
    additional_context:
      description: |
        Optional free-form text appended to the LLM generation prompt.
        Use this to provide extra context, constraints, or focus areas
        that the model should consider when analysing alerts.
        Example: "Focus on lateral movement and privilege escalation."
      type: string
    alert_retrieval_mode:
      default: custom_query
      description: |
        Controls how alerts are retrieved before generation.
        - provided: Skips retrieval; uses the \`alerts\` input directly.
          Automatically selected when \`alerts\` is non-empty.
        - custom_query: Retrieves alerts via DSL query (default when
          \`alerts\` is empty). Respects \`start\`, \`end\`, \`size\`, and \`filter\`.
        - esql: Retrieves alerts via the ES|QL query in \`esql_query\`.
        - custom_only: Skips the built-in retrieval; uses only results from
          \`alert_retrieval_workflow_ids\` (custom retrieval workflows).
      enum:
        - custom_only
        - custom_query
        - esql
        - provided
      type: string
    alert_retrieval_workflow_ids:
      default: []
      description: |
        Optional array of custom alert retrieval workflow IDs.
        These workflows run in parallel with the chosen retrieval mode,
        and their results are merged into the alert set for generation.
      items:
        type: string
      type: array
    alerts:
      default: []
      description: |
        Pre-retrieved anonymized alert texts. **Primary composability input.**
        When provided, alert retrieval is skipped automatically
        (alert_retrieval_mode becomes "provided"). This is how a detection
        rule, upstream retrieval step, or another workflow feeds alerts
        into Attack Discovery.
        Example: steps.my_retrieval_step.output.alerts
      items:
        type: string
      type: array
    connector_id:
      description: |
        Optional LLM connector UUID used for generation. When omitted, the
        server resolves the configured default AI connector
        (genAiSettings:defaultAIConnector, with an inference default-connector
        fallback). Provide a value to override the configured default.
      type: string
    end:
      description: |
        Time range end (Elasticsearch date math, e.g. "now").
        Used when alert_retrieval_mode is custom_query.
      type: string
    esql_query:
      description: |
        ES|QL query for alert retrieval. Required when
        alert_retrieval_mode is "esql".
        Example: FROM .alerts-security.alerts-default
                 | WHERE kibana.alert.severity == "critical"
                 | LIMIT 50
      type: string
    filter:
      additionalProperties: true
      description: |
        Elasticsearch DSL query filter applied during alert retrieval.
        Used when alert_retrieval_mode is custom_query.
      type: object
    mode:
      default: sync
      description: |
        Execution mode for the pipeline.
        - sync: Waits for the full pipeline and returns discoveries inline.
        - async: Fires the pipeline and returns execution_uuid immediately.
      enum:
        - async
        - sync
      type: string
    size:
      default: 100
      description: |
        Maximum number of alerts to retrieve. Applies to custom_query
        and esql retrieval modes.
      type: integer
    start:
      description: |
        Time range start (Elasticsearch date math, e.g. "now-24h").
        Used when alert_retrieval_mode is custom_query.
      type: string
    validation_workflow_id:
      default: ''
      description: |
        Override the built-in validation workflow. Pass a workflow ID
        to use a custom validation workflow, or leave empty to use
        the default validation.
      type: string

steps:
  - name: run_attack_discovery
    type: security.attack-discovery.run
    timeout: '10m'
    with:
      # \`alerts\` is the primary composability point — when non-empty,
      # alert_retrieval_mode is automatically set to "provided".
      additional_context: \${{ inputs.additional_context }}
      alert_retrieval_mode: \${{ inputs.alert_retrieval_mode }}
      alert_retrieval_workflow_ids: \${{ inputs.alert_retrieval_workflow_ids }}
      alerts: \${{ inputs.alerts }}
      connector_id: \${{ inputs.connector_id }}
      end: \${{ inputs.end }}
      esql_query: \${{ inputs.esql_query }}
      filter: \${{ inputs.filter }}
      mode: \${{ inputs.mode }}
      size: \${{ inputs.size }}
      start: \${{ inputs.start }}
      validation_workflow_id: \${{ inputs.validation_workflow_id }}`,
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW = {
  id: ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 2,
  yaml: `version: '1'
name: Security - Attack discovery - Custom validation example
description: |
  This example Attack Discovery validation workflow demonstrates how to compose
  built-in steps with custom logic to validate and enrich generated discoveries.

  It runs the standard validation step (hallucination detection and deduplication),
  then applies a per-field transformation using a \`data.map\` step with Liquid
  filters, and finally persists the results to Elasticsearch.

  Use this as a starting point for adding your own custom validation or
  enrichment. Replace the \`| upcase\` filters in the \`data.map\` step with any
  Liquid transformation — such as truncation, custom labelling, or field
  normalization — to build a post-validation pipeline tailored to your needs.
enabled: true
tags:
  - Attack discovery
  - Security
  - Example
  - attackDiscovery:custom_validation_example

triggers:
  - type: manual

inputs:
  additionalProperties: false
  properties:
    alerts_context_count:
      description: Number of alerts analyzed
      type: integer
    alerts_index_pattern:
      description: >
        Elasticsearch index pattern for security alerts. When not provided,
        defaults to .alerts-security.alerts-<spaceId> using the current
        Kibana space (via workflow.spaceId).
      type: string
    anonymized_alerts:
      description: Anonymized alerts in Document format
      items:
        additionalProperties: true
        type: object
      type: array
    api_config:
      additionalProperties: false
      description: LLM API configuration
      properties:
        action_type_id:
          type: string
        connector_id:
          type: string
        model:
          type: string
      required:
        - connector_id
      type: object
    attack_discoveries:
      description: Attack discoveries to validate
      items:
        additionalProperties: true
        type: object
      type: array
    connector_name:
      description: LLM connector name
      type: string
    enable_field_rendering:
      default: true
      description: Enable field rendering in UI
      type: boolean
    generation_uuid:
      description: Generation execution UUID for tracking
      type: string
    replacements:
      additionalProperties: true
      description: Anonymization replacements
      type: object
    source:
      description: How the generation was triggered (interactive, scheduled, or action)
      enum:
        - action
        - interactive
        - scheduled
      type: string
    with_replacements:
      default: false
      description: Include replacements in response
      type: boolean
  required:
    - alerts_context_count
    - anonymized_alerts
    - api_config
    - attack_discoveries
    - generation_uuid

steps:
  # Step 1: Filter hallucinated alert IDs and deduplicate discoveries.
  - name: validate_discoveries
    type: security.attack-discovery.defaultValidation
    timeout: '5m'
    with:
      alerts_context_count: \${{ inputs.alerts_context_count }}
      alerts_index_pattern: '{%- if inputs.alerts_index_pattern -%}{{ inputs.alerts_index_pattern }}{%- else -%}.alerts-security.alerts-{{ workflow.spaceId }}{%- endif -%}'
      anonymized_alerts: \${{ inputs.anonymized_alerts }}
      api_config: \${{ inputs.api_config }}
      attack_discoveries: \${{ inputs.attack_discoveries }}
      connector_name: \${{ inputs.connector_name }}
      generation_uuid: \${{ inputs.generation_uuid }}
      replacements: \${{ inputs.replacements }}

  # Step 2: Transform each validated discovery using \`data.map\`.
  # This step iterates over discoveries and applies a per-field Liquid filter.
  # Replace \`| upcase\` with any Liquid transformation for your use case.
  - name: transform_discoveries
    type: data.map
    items: \${{ steps.validate_discoveries.output.validated_discoveries }}
    with:
      fields:
        alert_ids: \${{ item.alert_ids }}
        details_markdown: \${{ item.details_markdown | upcase }}
        entity_summary_markdown: \${{ item.entity_summary_markdown | upcase }}
        id: \${{ item.id }}
        mitre_attack_tactics: \${{ item.mitre_attack_tactics }}
        summary_markdown: \${{ item.summary_markdown | upcase }}
        timestamp: \${{ item.timestamp }}
        title: \${{ item.title | upcase }}

  # Step 3: Persist the transformed discoveries to Elasticsearch.
  - name: persist_discoveries
    type: security.attack-discovery.persistDiscoveries
    timeout: '5m'
    with:
      alerts_context_count: \${{ inputs.alerts_context_count }}
      anonymized_alerts: \${{ inputs.anonymized_alerts }}
      api_config: \${{ inputs.api_config }}
      attack_discoveries: \${{ steps.transform_discoveries.output }}
      connector_name: \${{ inputs.connector_name }}
      enable_field_rendering: \${{ inputs.enable_field_rendering }}
      generation_uuid: \${{ inputs.generation_uuid }}
      replacements: \${{ inputs.replacements }}
      source: \${{ inputs.source }}
      with_replacements: \${{ inputs.with_replacements }}`,
} as const satisfies ManagedWorkflowDefinition;
