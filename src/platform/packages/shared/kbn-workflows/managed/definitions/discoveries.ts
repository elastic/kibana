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
export const ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID =
  'system-attack-discovery-skill-alert-retrieval';
export const ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID = 'system-attack-discovery-skill-report';
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

export const ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW = {
  id: ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 10,
  yaml: `version: '1'
name: Security - Attack discovery - Skill
description: |
  The always-on Attack Discovery generation-phase GATE. Runs the
  attack-discovery-generator skill in its ground-truth mode (Mode C) via a
  native \`ai.agent\` step: the skill receives the deterministic retrieval
  phase's candidate alerts, ground-truths them, and returns a DECISION (not
  data) — a keep-set of candidate \`_id\`s, any net-new alerts it retrieved
  itself (when the skill toggle is on), and corroboration context. It does NOT
  generate discoveries and NEVER invokes the attack-discovery.run tool; the
  generation pipeline runs separately and unconditionally after the gate.

  Per Constraint B the gate emits decisions only and never echoes the candidate
  bytes it received — the orchestration forwards the original kept candidate
  bytes by \`_id\` (no re-fetch, no distillation).

  The \`ai.agent\` step runs with \`create-conversation: true\` so the underlying
  Agent Builder conversation is persisted; the conversation id is surfaced as
  workflow output so the report phase can resume that conversation to render the
  Attack Discovery Report.
enabled: true
tags:
  - Attack discovery
  - Security
  - AI Agent
  - attackDiscovery:gate

triggers:
  - type: manual

inputs:
  additionalProperties: false
  properties:
    alerts_index_pattern:
      description: >
        Elasticsearch index pattern for security alerts. When not provided,
        defaults to .alerts-security.alerts-<spaceId> using the current
        Kibana space (via workflow.spaceId). Used only when the skill performs
        its own additional retrieval (skill_enabled).
      type: string
    candidate_alerts:
      default: []
      description: >
        The candidate alert strings produced by the deterministic retrieval
        phase, for the gate to ground-truth. Each candidate embeds its backing
        document _id. The gate keeps a subset by _id (it never echoes these
        bytes back); the orchestration forwards the original kept bytes.
      items:
        type: string
      type: array
    connector_id:
      description: >
        GenAI connector id used by the gate \`ai.agent\` step's model routing.
        Per Constraint A this is the same (or a larger-context) connector used
        for the generation request, so the gate never fails on inputs the
        generate step would accept. When omitted (or empty), the step falls
        back to the Agent Builder default model.
      type: string
    end:
      default: now
      description: Time range end (date math, e.g., now)
      type: string
    size:
      default: 100
      description: >
        Maximum number of alerts the skill should retrieve when it performs its
        own additional retrieval (skill_enabled).
      type: integer
    skill_enabled:
      default: false
      description: >
        Skill toggle (Toggle 1). When true, the gate may retrieve net-new
        alerts of its own (in addition to ground-truthing the candidates) and
        return their _id values in added_alert_ids. When false, the gate only ground-truths
        the candidate set and adds none.
      type: boolean
    start:
      default: now-24h
      description: Time range start (date math, e.g., now-24h, now-7d)
      type: string

steps:
  # Invoke the attack-discovery-generator skill in its ground-truth mode (Mode C).
  #
  # The skill is referenced via a markdown skill mention
  # ([/name](skill://skill-id)); the default Elastic AI agent loads it and
  # follows its Mode C guidance: ground-truth the candidate alerts and return a
  # DECISION as typed \`structured_output\` (keep_alert_ids / added_alert_ids /
  # additional_context).
  #
  # \`create-conversation: true\` persists the conversation so its id can be
  # surfaced (and later resumed by the report phase).
  - name: gate
    type: ai.agent
    timeout: '10m'
    create-conversation: true
    # Route the skill's model calls through the connector selected for this
    # generation (Constraint A). When the input is empty/omitted, this renders
    # to undefined and the step falls back to the Agent Builder default model.
    connector-id: '\${{ inputs.connector_id }}'
    with:
      message: >
        Use the [/attack-discovery-generator](skill://attack-discovery-generator)
        skill in Mode C (ground-truth gate). You are the generation-phase gate:
        ground-truth the candidate alerts below and return a DECISION, not data,
        and not a report.

        Candidate alerts to ground-truth (each line is one candidate; its backing
        document _id is embedded in the line):
        {% for alert in inputs.candidate_alerts %}
        - {{ alert }}
        {% endfor %}

        Decide which candidates to KEEP. DEFAULT to keeping every candidate; only
        remove one when you have concrete justification that it is a false
        positive or not attack-relevant. Favor recall — the downstream Attack
        Discovery pipeline does the attack-chain analysis and false-positive
        filtering and cannot analyze any alert you remove.
        {% if inputs.skill_enabled %}
        Additional retrieval is ENABLED: you MUST also retrieve net-new alerts of
        your own. Run the space-aware default ES|QL query (call the
        get_default_esql_query tool to obtain the baseline query, then run it via
        execute_esql) against the
        {%- if inputs.alerts_index_pattern %} {{ inputs.alerts_index_pattern }}
        {%- else %} .alerts-security.alerts-{{ workflow.spaceId }}
        {%- endif %} index for the time window {{ inputs.start }} to {{ inputs.end }}
        (up to {{ inputs.size }} alerts), adapting it only when the investigation
        warrants. The baseline query selects the backing document _id (METADATA
        _id); record the _id value of EVERY alert you retrieve in
        \`added_alert_ids\` IMMEDIATELY, BEFORE you run any corroboration — ids
        ONLY, never the alert contents (the orchestration re-fetches the full
        alerts by _id). Corroboration is best-effort CONTEXT only: it informs
        \`additional_context\` and MUST NOT remove or shrink \`added_alert_ids\`.
        NEVER drop a self-retrieved alert because a raw-log / threat-hunting /
        entity pivot came back empty or inconclusive — absence of corroborating
        telemetry is NOT evidence of a false positive, and the downstream Attack
        Discovery generation pipeline performs the attack-chain analysis and
        false-positive filtering and CANNOT see any alert you omit. Apply the same
        recall-first, default-to-INCLUDE rule to \`added_alert_ids\` that you apply
        to \`keep_alert_ids\`. When there are no candidate alerts above, this
        retrieval is the ONLY source of alerts for the run — returning an empty
        \`added_alert_ids\` is a failure; broaden the time window and retry before
        giving up rather than returning nothing.
        {% else %}
        Additional retrieval is DISABLED: ground-truth ONLY the candidates above
        and add none — leave \`added_alert_ids\` empty.
        {% endif %}
        Corroboration is best-effort and BOUNDED multi-skill: load the core
        corroboration skills — threat-hunting (pivot into raw telemetry),
        entity-analytics (host/user risk and asset criticality), and
        alert-analysis (drill into the alerts behind each candidate) — and run
        them against the alerts you are keeping. Three HARD guardrails keep
        this inside the gate's 10m timeout and token budget: (a) the output stays
        DECISION-ONLY / IDS-ONLY — corroboration feeds the short
        \`additional_context\` summary, never a report or raw data; (b)
        corroboration is NEVER a reason to drop an alert from \`keep_alert_ids\` or
        \`added_alert_ids\` — recall wins, and an inconclusive or empty pivot
        leaves the keep/added sets untouched; and (c) a budget cap — scope
        corroboration to the kept candidates, summarize findings, never dump raw
        telemetry, and skip a skill rather than blow the turn (skip gracefully
        when a skill is unavailable). Summarize any
        corroboration findings (entity risk and asset criticality, telemetry
        pivots, false-positive triage, threat-intel hits) into
        \`additional_context\`.

        OUTPUT CONTRACT (decision only): return the _id values of the candidates
        you keep in \`keep_alert_ids\` — ids ONLY, do NOT re-emit, paraphrase, or
        echo the candidate alert contents (the orchestration forwards the original
        kept bytes by _id). Put the _id values of any net-new alerts you retrieved
        yourself in \`added_alert_ids\` — ids ONLY, same contract as
        \`keep_alert_ids\` (the orchestration re-fetches the full alerts by _id).
        Put corroboration insight in \`additional_context\`.

        Do NOT generate attack discoveries, do NOT render an Attack Discovery
        Report, and do NOT invoke the attack-discovery.run tool.
      schema:
        type: object
        properties:
          keep_alert_ids:
            type: array
            items:
              type: string
            description: >
              The backing document _id values of the candidate alerts to KEEP (a
              subset of the candidate _ids). Default to keeping all; remove only
              with concrete justification. Return ids ONLY — do NOT echo the
              candidate alert contents.
          added_alert_ids:
            type: array
            items:
              type: string
            description: >
              The backing document _id values of any NET-NEW alerts the skill
              retrieved itself (only when additional retrieval is enabled). Ids
              ONLY — same contract as keep_alert_ids; the orchestration re-fetches
              the full alerts by _id. Empty when the gate added none.
          additional_context:
            type: string
            description: >
              A concise summary of the corroboration findings gathered via the
              Cross-Skill Corroboration loop (entity risk and asset criticality,
              telemetry pivots, false-positive triage, threat-intel hits) —
              surfaced to the downstream generation LLM as extra signal.
        required:
          - keep_alert_ids
    # NOTE: deliberately no \`on-failure: retry\`. The \`ai.agent\` step is
    # conversation-stateful and long-running; a retry restarts it from scratch
    # (discarding all prior progress) and, on a timeout, simply burns the
    # remaining pipeline budget — guaranteeing failure rather than recovering.
    # Surfacing the failure immediately is the correct behavior (fail-closed).

  # Emit the gate DECISION plus the persisted conversation id as the workflow
  # output. Downstream orchestration consumes \`keep_alert_ids\` (forwarding the
  # original kept candidate bytes by _id), \`added_alert_ids\` (the skill's own
  # net-new additions), \`additional_context\`, and \`conversation_id\` for the
  # resumable report phase.
  - name: emit_decision
    type: workflow.output
    status: completed
    with:
      keep_alert_ids: '\${{ steps.gate.output.structured_output.keep_alert_ids | default: [] }}'
      added_alert_ids: '\${{ steps.gate.output.structured_output.added_alert_ids | default: [] }}'
      additional_context: "\${{ steps.gate.output.structured_output.additional_context | default: '' }}"
      conversation_id: '\${{ steps.gate.output.conversation_id }}'`,
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW = {
  id: ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 1,
  yaml: `version: '1'
name: Security - Attack discovery - Skill report
description: |
  Phase 2 of skill-driven Attack Discovery 2.0: after generation and validation
  have produced an \`execution_uuid\` and persisted discoveries, this workflow
  RESUMES the Agent Builder conversation that was persisted by the skill alert
  retrieval workflow (Phase 1) so the attack-discovery-generator skill renders
  the full Attack Discovery Report into that same conversation.

  The \`ai.agent\` step continues the existing conversation via the
  \`conversation_id\` input (no \`create-conversation\`) and drives the skill's
  status-only path (Mode B): the skill calls the
  \`security.attack-discovery.get_status\` tool with the supplied
  \`execution_uuid\` and renders the report for the returned discoveries.

  This workflow is invoked fire-and-forget by the AD 2.0 orchestration after
  validation succeeds, so report failures never affect the generation outcome.
enabled: true
tags:
  - Attack discovery
  - Security
  - AI Agent
  - attackDiscovery:skill_report

triggers:
  - type: manual

inputs:
  additionalProperties: false
  properties:
    conversation_id:
      description: >
        Identifier of the persisted Agent Builder conversation created by the
        skill alert retrieval workflow. The report is rendered into this same
        conversation.
      type: string
    execution_uuid:
      description: >
        The Attack Discovery 2.0 generation \`execution_uuid\` whose persisted
        discoveries should be rendered as the report (via the status-only path).
      type: string
  required:
    - conversation_id
    - execution_uuid

steps:
  # Resume the persisted conversation and drive the skill's status-only path
  # (Mode B). Passing \`conversation_id\` (without \`create-conversation\`)
  # continues the existing conversation instead of creating a new one, so the
  # rendered report lands in the same thread the alert retrieval phase started.
  - name: render_report
    type: ai.agent
    timeout: '10m'
    with:
      conversation_id: \${{ inputs.conversation_id }}
      message: >
        The Attack Discovery generation for execution_uuid
        {{ inputs.execution_uuid }} has completed. Use the
        [/attack-discovery-generator](skill://attack-discovery-generator) skill
        in status-only mode (Mode B): call the
        \`security.attack-discovery.get_status\` tool with that execution_uuid
        and render the full Attack Discovery Report for the returned
        discoveries.

        After rendering the report, perform the Missed Detection Closure pass.
        Because this status-resume path did not run its own upstream
        investigation, first run a best-effort, lightweight raw-log
        corroboration of the persisted attack chains to surface malicious
        actions the curated alert set did not catch. Emit a
        \`## ⚠️ Missed Detection\` heading for each coverage gap and draft a
        candidate ES|QL detection rule for each gap.

        Then PAUSE for explicit approval: ask the user to reply with
        \`create the rule\` before any detection rule is created.

        Do not start a new generation and do not invoke the
        attack-discovery.run tool. Do NOT auto-create detection rules without
        the user's \`create the rule\` reply.
    on-failure:
      retry:
        max-attempts: 3`,
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
        'provided' (alerts supplied directly via the \`alerts\` input; retrieval is skipped),
        'skill' (alerts retrieved by the attack-discovery-generator skill workflow).
        This field is read but not acted upon by this workflow.
        The _generate endpoint handles retrieval orchestration.
      type: string
      enum: ['custom_only', 'custom_query', 'esql', 'provided', 'skill']
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
