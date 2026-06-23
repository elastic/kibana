/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../types';

export const ERROR_SENTRY_CAPTURE_WORKFLOW_ID = 'system-error-sentry-capture';
export const ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID = 'system-error-sentry-escalate-github';
export const ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID = 'system-error-sentry-ask-ralph';
export const ERROR_SENTRY_INTROSPECT_WORKFLOW_ID = 'system-error-sentry-introspect';
export const ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID =
  'system-error-sentry-ralph-investigation';

const ERROR_SENTRY_WORKFLOW_MANAGEMENT = {
  lifecycle: 'dynamic',
  versionStrategy: 'on_adopt',
  enablement: 'restorable',
} as const;

export const ERROR_SENTRY_CAPTURE_WORKFLOW = {
  id: ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
  pluginId: 'errorSentry',
  version: 9,
  yaml: `version: "1"
name: Error Sentry - Capture log error patterns
enabled: true
triggers:
  - type: scheduled
    with:
      every: 24h
steps:
  - name: read_config
    type: error-sentry.readCaptureConfig
  - name: collect
    type: error-sentry.collectLogPatterns
    with:
      index: "{{ steps.read_config.output.index }}"
      lookbackDays: 7
      categoryField: "{{ steps.read_config.output.categoryField }}"
      logLevels: "{{ steps.read_config.output.logLevels }}"
      timestampField: "@timestamp"
      minDocCount: 10
      size: 20
  - name: process_patterns
    type: foreach
    foreach: "{{ steps.collect.output.patterns }}"
    steps:
      - name: fetch_sample
        type: elasticsearch.request
        with:
          method: POST
          path: /{{ steps.read_config.output.index }}/_search
          body:
            size: 1
            sort:
              - "@timestamp": desc
            query:
              simple_query_string:
                fields:
                  - "{{ steps.read_config.output.categoryField }}"
                query: "{{ foreach.item.key }}"
                default_operator: AND
                flags: NONE
            _source: true
      - name: fetch_stats
        type: elasticsearch.esql.query
        with:
          params:
            - "{{ foreach.item.key }}"
          query: |
            FROM {{ steps.read_config.output.index }}
            | WHERE @timestamp >= NOW() - 7 days
            | WHERE MATCH({{ steps.read_config.output.categoryField }}, ?, {"operator": "AND"})
            | STATS first_seen = MIN(@timestamp), last_seen = MAX(@timestamp)
          format: json
      - name: find_existing
        type: cases.findCases
        with:
          owner: observability
          page: 1
          perPage: 20
          status:
            - open
            - in-progress
          tags:
            - error-sentry:{{ foreach.item.hash }}
      - name: upsert_case
        type: if
        condition: steps.find_existing.output.total > 0
        steps:
          - name: add_occurrence_comment
            type: cases.addComment
            with:
              case_id: "{{ steps.find_existing.output.cases[0].id }}"
              comment: |
                🔁 Reoccurrence detected — {{ foreach.item.docCount }} occurrence(s) in the last 7 days.
            push-case: false
        else:
          - name: compute_volume
            type: data.set
            with:
              volume_tag: |
                {%- liquid
                  if foreach.item.occurrenceLevel == "critical" or foreach.item.occurrenceLevel == "high"
                    echo "volume:high"
                  elsif foreach.item.occurrenceLevel == "medium"
                    echo "volume:medium"
                  else
                    echo "volume:low"
                  endif
                -%}
          - name: create_case
            type: cases.createCase
            with:
              description: |
                {%- liquid
                  assign src = steps.fetch_sample.output.hits.hits[0]._source
                  assign attrs = src.resource.attributes
                  assign deployment = attrs["k8s.deployment.name"] | default: ""
                  assign namespace = attrs["k8s.namespace.name"] | default: ""
                  assign pod = attrs["k8s.pod.name"] | default: ""
                  assign host_name = attrs["host.name"] | default: ""
                  assign sample_time = src["@timestamp"] | default: ""
                  assign sample_body = src.body.text | default: ""
                  assign severity_text_sample = src.severity_text | default: ""
                  assign trace_id_sample = src.trace.id | default: ""
                -%}
                **Pattern signature:** \`{{ foreach.item.key }}\`
                **Category hash:** \`{{ foreach.item.hash }}\`

                | | | |
                |---|---|---|
                | 📊 **Occurrences (7d)** | {{ foreach.item.docCount }} | |
                | 📶 **Occurrence level** | {{ foreach.item.occurrenceLevel }} | |
                | 🕒 **First seen** | {{ steps.fetch_stats.output.values[0][0] }} | |
                | 🕓 **Last seen** | {{ steps.fetch_stats.output.values[0][1] }} | |
                | 🖥️ **Service (most recent)** | {% if deployment != "" %}{% if namespace != "" %}\`{{ namespace }}/{{ deployment }}\`{% else %}\`{{ deployment }}\`{% endif %}{% else %}_(unknown)_{% endif %} | {% if deployment != "" %}[APM](/kbn/app/apm/services/{{ deployment }}/overview?rangeFrom=now-7d&rangeTo=now) · [Metrics Hosts](/kbn/app/metrics/hosts?_a=(dateRange:(from:now-7d,to:now),filters:!(),limit:100,panelFilters:!((meta:(controlledBy:service.name,index:%27metrics-*,metricbeat-*%27,key:service.name),query:(match_phrase:(service.name:{{ deployment | replace: " ", "%20" }})))),preferredSchema:semconv,query:(language:kuery,query:%27%27))&controlPanels=(os.type:(exclude:!f,existsSelected:!f,fieldName:os.type,grow:!t,id:os.type,ignore_validations:!f,order:0,run_past_timeout:!f,search_technique:wildcard,selectedOptions:!(),single_select:!f,sort:(by:_count,direction:desc),title:%27Operating%20System%27,type:options_list_control,use_global_filters:!t,width:small),service.name:(exclude:!f,existsSelected:!f,fieldName:service.name,grow:!t,id:service.name,ignore_validations:!f,order:2,run_past_timeout:!f,search_technique:wildcard,selectedOptions:!({{ deployment | replace: " ", "%20" }}),single_select:!f,sort:(by:_count,direction:desc),title:%27Service%20Name%27,type:options_list_control,use_global_filters:!t,width:small))){% endif %} |
                | 🧊 **Pod (most recent)** | {% if pod != "" %}\`{{ pod }}\`{% else %}_(unknown)_{% endif %} | {% if pod != "" %}[Logs in Discover](/kbn/app/discover#/?_g=(time:(from:now-7d,to:now))&_a=(dataSource:(type:esql),query:(esql:'FROM%20{{ steps.read_config.output.index }}%20%7C%20WHERE%20@timestamp%20>=%20NOW()%20-%207%20days%20%7C%20WHERE%20resource.attributes.k8s.pod.name%20==%20%22{{ pod | replace: " ", "%20" }}%22%20%7C%20SORT%20@timestamp%20DESC%20%7C%20LIMIT%20500'))){% endif %} |
                | 🏠 **Collector host** | {% if host_name != "" %}\`{{ host_name }}\`{% else %}_(unknown)_{% endif %} | {% if host_name != "" %}[Logs in Discover](/kbn/app/discover#/?_g=(time:(from:now-7d,to:now))&_a=(dataSource:(type:esql),query:(esql:'FROM%20{{ steps.read_config.output.index }}%20%7C%20WHERE%20@timestamp%20>=%20NOW()%20-%207%20days%20%7C%20WHERE%20host.name%20==%20%22{{ host_name | replace: " ", "%20" }}%22%20%7C%20SORT%20@timestamp%20DESC%20%7C%20LIMIT%20500'))){% endif %} |
                {% if severity_text_sample != "" %}| 🔖 **Severity text** | \`{{ severity_text_sample }}\` | |
                {% endif %}{% if trace_id_sample != "" %}| 🧵 **Trace ID** | \`{{ trace_id_sample }}\` | |
                {% endif %}

                **Sample log** ({{ sample_time }}):

                \`\`\`
                {{ sample_body }}
                \`\`\`

                [🔎 Open in Discover](/kbn/app/discover#/?_g=(time:(from:now-7d,to:now))&_a=(dataSource:(type:esql),query:(esql:'FROM%20{{ steps.read_config.output.index }}%20|%20WHERE%20@timestamp%20>=%20NOW()%20-%207%20days%20|%20WHERE%20MATCH({{ steps.read_config.output.categoryField }},%20%22{{ foreach.item.key | replace: " ", "%20" }}%22)%20|%20SORT%20@timestamp%20DESC%20|%20LIMIT%20500')))

                <!-- lpit-category-hash: {{ foreach.item.hash }} -->
              owner: observability
              severity: low
              tags:
                - error-sentry
                - error-category
                - error-sentry:{{ foreach.item.hash }}
                - "{{ steps.compute_volume.output.volume_tag }}"
              title: "[Error Sentry] {{ foreach.item.key | truncate: 144 }}"
            push-case: false
`,
  management: ERROR_SENTRY_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;

export const ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW = {
  id: ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID,
  pluginId: 'errorSentry',
  version: 6,
  yaml: `version: "1"
name: Error Sentry - Detective Ralph investigation
description: Runs an AI investigation (Detective Ralph) on each Error Sentry case when it is created, then posts the findings back as a comment on the case.
enabled: true
triggers:
  - type: cases.caseCreated
    on:
      condition: 'event.owner: "observability"'
steps:
  - name: get_case
    type: cases.getCase
    with:
      case_id: "{{ event.caseId }}"
      include_comments: false
  - name: check_tag
    type: data.set
    with:
      is_error_sentry_case: "{% if steps.get_case.output.case.tags contains 'error-sentry' %}true{% else %}false{% endif %}"
  - name: if_error_sentry
    type: if
    condition: 'steps.check_tag.output.is_error_sentry_case: "true"'
    steps:
      - name: detective_ralph
        type: ai.agent
        with:
          schema:
            type: object
            properties:
              summary:
                type: string
                description: A single sentence summarising the root cause and what the on-call engineer should focus on first. No markdown.
              root_cause:
                type: string
                description: The most likely root cause of the issue, based on the log pattern and case details.
              history:
                type: string
                description: The history of commits that lead up to the issue based on commit history
              next_steps:
                type: array
                description: 2-3 concrete next investigation steps for the on-call engineer.
                items:
                  type: string
              severity:
                type: string
                description: >
                  The true business-impact severity of this error. Base this on what the error actually means —
                  error type (crash, OOM, data corruption, auth failure → higher), affected service criticality,
                  blast radius, and whether it is persistent or intermittent. Do NOT derive severity solely from
                  occurrence count: a rare crash can be critical while a frequent harmless warning is low.
                enum:
                  - low
                  - medium
                  - high
                  - critical
              confidence:
                type: string
                description: Confidence rating for the analysis.
                enum:
                  - low
                  - medium
                  - high
            required:
              - summary
              - root_cause
              - history
              - next_steps
              - severity
              - confidence
          message: |
            You are investigating a new Error Sentry case.

            - Title: {{ steps.get_case.output.case.title }}
            - Initial severity (from occurrence count — you will reassess this): {{ steps.get_case.output.case.severity }}

            {{ steps.get_case.output.case.description }}
        agent-id: detective-ralph
        create-conversation: true
      - name: update_severity
        type: kibana.request
        with:
          method: PATCH
          path: /api/cases
          body:
            cases:
              - id: "{{ event.caseId }}"
                version: "{{ steps.get_case.output.case.version }}"
                severity: "{{ steps.detective_ralph.output.structured_output.severity }}"
      - name: post_investigation
        type: cases.addComment
        with:
          case_id: "{{ event.caseId }}"
          comment: |
            ## 🕵️ Detective Ralph investigation

            > {{ steps.detective_ralph.output.structured_output.summary }}

            **Likely root cause**
            {{ steps.detective_ralph.output.structured_output.root_cause }}

            **How we got here**
            {{ steps.detective_ralph.output.structured_output.history }}

            **Suggested next steps**
            {% for step in steps.detective_ralph.output.structured_output.next_steps -%}
            {{ forloop.index }}. {{ step }}
            {% endfor %}
            **Confidence:** \`{{ steps.detective_ralph.output.structured_output.confidence }}\`

            ---
            👉 To escalate this to a GitHub issue, comment \`/escalate-github\` on this case.

            <!-- ralph-summary: {{ steps.detective_ralph.output.structured_output.summary }} -->
            <!-- ralph-conversation: {{ steps.detective_ralph.output.conversation_id }} -->
        push-case: false
`,
  management: ERROR_SENTRY_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;

export const ERROR_SENTRY_INTROSPECT_WORKFLOW = {
  id: ERROR_SENTRY_INTROSPECT_WORKFLOW_ID,
  pluginId: 'errorSentry',
  version: 1,
  yaml: `version: "1"
name: Error Sentry - Introspect log configuration
description: Discovers the best log index and categorization field for the capture workflow, then writes the result to Elasticsearch.
enabled: true
triggers:
  - type: manual
steps:
  - name: introspect
    type: error-sentry.introspectLogs
    with:
      candidateIndexPatterns:
        - logs.otel
        - logs-*
        - filebeat-*
        - logstash-*
      preferredCategoryFields:
        - body.text
        - message
        - log.message
        - event.original
`,
  management: ERROR_SENTRY_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;

export const ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW = {
  id: ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID,
  pluginId: 'errorSentry',
  version: 2,
  yaml: `version: "1"
name: Error Sentry - Escalate case to GitHub issue
description: Listens for comments added to Observability (Error Sentry) cases. When a user posts the /escalate-github sentinel in a comment, creates a mirrored GitHub issue and replies on the case with the issue link.
enabled: true
consts:
  escalation_sentinel: /escalate-github
triggers:
  - type: cases.commentsAdded
    on:
      condition: 'event.owner: "observability"'
steps:
  - name: get_case
    type: cases.getCase
    with:
      case_id: "{{ event.caseId }}"
      include_comments: false
  - name: get_attachments
    type: cases.getAllAttachments
    with:
      case_id: "{{ event.caseId }}"
  - name: compute_flags
    type: data.set
    with:
      is_error_sentry_case: |
        {%- liquid
          assign found = false
          for tag in steps.get_case.output.case.tags
            if tag == "error-sentry"
              assign found = true
            endif
          endfor
          echo found
        -%}
      has_escalate_comment: |
        {%- liquid
          assign found = false
          for att in steps.get_attachments.output.attachments
            if att.comment contains consts.escalation_sentinel
              assign author = att.created_by.username | default: ""
              if author != "elastic/kibana"
                assign found = true
              endif
            endif
          endfor
          echo found
        -%}
      already_escalated: |
        {%- liquid
          assign found = false
          for att in steps.get_attachments.output.attachments
            if att.comment contains "github.com/" and att.comment contains "/issues/"
              assign author = att.created_by.username | default: ""
              if author == "elastic/kibana"
                assign found = true
              endif
            endif
          endfor
          echo found
        -%}
      error_sentry_hash_tag: |
        {%- liquid
          assign hash_tag = ""
          for tag in steps.get_case.output.case.tags
            if tag contains "error-sentry:"
              assign hash_tag = tag
            endif
          endfor
          echo hash_tag
        -%}
  - name: maybe_escalate
    type: if
    condition: 'steps.compute_flags.output.is_error_sentry_case : "true" and steps.compute_flags.output.has_escalate_comment : "true" and steps.compute_flags.output.already_escalated : "false"'
    steps:
      - name: create_issue
        type: github.callTool
        with:
          name: issue_write
          arguments:
            method: create
            owner: elastic
            repo: fictional-carnival
            title: "{{ steps.get_case.output.case.title }}"
            body: |
              {{ steps.get_case.output.case.description }}
              {%- liquid
                assign ralph_comment = ""
                for att in steps.get_attachments.output.attachments
                  if att.comment contains "<!-- ralph-conversation:"
                    assign ralph_comment = att.comment
                  endif
                endfor
              -%}
              {% if ralph_comment != "" %}

              ---

              ## 🔍 Detective Ralph's Investigation

              {{ ralph_comment }}
              {% endif %}

              ---
              Escalated from Kibana case: {{ event.spaceId | default: "default" | prepend: "/s/" | append: "/app/observability/cases/" | append: event.caseId }}
            labels:
              - error-category
              - from-kibana-case
              - "{{ steps.compute_flags.output.error_sentry_hash_tag }}"
        connector-id: github
      - name: confirm_on_case
        type: cases.addComment
        with:
          case_id: "{{ event.caseId }}"
          comment: |
            {%- assign payload = steps.create_issue.output[0].text | json_parse -%}
            {%- assign url = payload | map: 'url' -%}
            {%- assign url_parts = url | split: '/' -%}
            {%- assign number = url_parts | last -%}
            {%- if url != blank -%}
            ✅ Created GitHub issue [#{{ number }}]({{ url }}) in \`elastic/fictional-carnival\` for this case.
            {%- else -%}
            ❌ Escalation requested but GitHub issue creation did not return a URL. Check the workflow execution log for the \`create_issue\` step.
            {%- endif -%}
        push-case: false
`,
  management: ERROR_SENTRY_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;

export const ERROR_SENTRY_ASK_RALPH_WORKFLOW = {
  id: ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID,
  pluginId: 'errorSentry',
  version: 1,
  yaml: `version: "1"
name: Error Sentry - Ask Detective Ralph
description: Lets users chat with Detective Ralph from inside a Kibana case by commenting "/ask-ralph <question>". Picks up the conversation_id from Ralph's original investigation comment so follow-ups have full context.
enabled: true
triggers:
  - type: cases.commentsAdded
    on:
      condition: 'event.owner: "observability"'
      workflowEvents: avoid-loop
steps:
  - name: get_case
    type: cases.getCase
    with:
      case_id: "{{ event.caseId }}"
      include_comments: false
  - name: get_comments
    type: kibana.request
    with:
      method: GET
      path: /api/cases/{{ event.caseId }}/comments/_find?perPage=100
  - name: compute_flags
    type: data.set
    with:
      is_error_sentry_case: "{% if steps.get_case.output.case.tags contains 'error-sentry' %}true{% else %}false{% endif %}"
      question: |
        {%- liquid
          assign found = ""
          for c in steps.get_comments.output.comments
            for id in event.commentIds
              if c.id == id and c.comment != blank
                assign text = c.comment | strip
                if text contains "/ask-ralph"
                  assign parts = text | split: "/ask-ralph"
                  assign rest = parts | last | strip
                  if rest != blank
                    assign found = rest
                  endif
                endif
              endif
            endfor
          endfor
          echo found
        -%}
      has_question: |
        {%- liquid
          assign q = ""
          for c in steps.get_comments.output.comments
            for id in event.commentIds
              if c.id == id and c.comment != blank
                assign text = c.comment | strip
                if text contains "/ask-ralph"
                  assign parts = text | split: "/ask-ralph"
                  assign rest = parts | last | strip
                  if rest != blank
                    assign q = rest
                  endif
                endif
              endif
            endfor
          endfor
          if q != ""
            echo "true"
          else
            echo "false"
          endif
        -%}
      conversation_id: |
        {%- liquid
          assign found = ""
          for c in steps.get_comments.output.comments
            if c.comment contains "<!-- ralph-conversation:"
              assign after = c.comment | split: "<!-- ralph-conversation:" | last
              assign id = after | split: "-->" | first | strip
              if id != blank
                assign found = id
              endif
            endif
          endfor
          echo found
        -%}
      has_conversation: |
        {%- liquid
          assign cid = ""
          for c in steps.get_comments.output.comments
            if c.comment contains "<!-- ralph-conversation:"
              assign after = c.comment | split: "<!-- ralph-conversation:" | last
              assign id = after | split: "-->" | first | strip
              if id != blank
                assign cid = id
              endif
            endif
          endfor
          if cid != ""
            echo "true"
          else
            echo "false"
          endif
        -%}
  - name: maybe_ask
    type: if
    condition: 'steps.compute_flags.output.is_error_sentry_case: "true" and steps.compute_flags.output.has_question: "true" and steps.compute_flags.output.has_conversation: "true"'
    steps:
      - name: ask_ralph
        type: ai.agent
        with:
          message: "{{ steps.compute_flags.output.question }}"
          conversation_id: "{{ steps.compute_flags.output.conversation_id }}"
        agent-id: detective-ralph
      - name: post_answer
        type: cases.addComment
        with:
          case_id: "{{ event.caseId }}"
          comment: |
            ## 🕵️ Detective Ralph (follow-up)

            > {{ steps.compute_flags.output.question }}

            {{ steps.ask_ralph.output.message }}

            ---
            💬 Ask another follow-up by commenting \`/ask-ralph <your question>\`.

            <!-- ralph-conversation: {{ steps.compute_flags.output.conversation_id }} -->
        push-case: false
`,
  management: ERROR_SENTRY_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition;
