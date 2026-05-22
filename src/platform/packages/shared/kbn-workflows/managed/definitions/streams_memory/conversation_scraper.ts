/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../types';

export const STREAMS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID =
  'system-streams-memory-conversation-scraper';

export const STREAMS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW = {
  id: STREAMS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  pluginId: 'streams',
  version: 1,
  yaml: `version: "1"

name: Conversation Scraper
description: >
  Extracts durable knowledge from recent AI chat conversations and persists it as
  memory wiki pages in .significant_events-memories. Runs on a 4h schedule.
enabled: true
settings:
  timeout: "30m"
  concurrency:
    key: "streams-sigevents-memory-scraper"
    strategy: drop
    max: 1
tags:
  - observability
  - streams
  - sigevents
  - memory
  - conversation-scraper

triggers:
  - type: scheduled
    with:
      every: "4h"

consts:
  CONVERSATIONS_LOOKBACK: "now-8h"

steps:
  - name: get_recent_conversations
    type: elasticsearch.request
    with:
      method: POST
      path: '/.kibana-observability-ai-assistant-conversations/_search'
      body:
        size: 50
        sort:
          - "@timestamp":
              order: desc
        _source:
          - "@timestamp"
          - conversation.id
          - conversation.title
          - messages
        query:
          bool:
            must:
              - range:
                  "@timestamp":
                    gte: '{{ consts.CONVERSATIONS_LOOKBACK }}'
    on-failure:
      continue: true

  - name: check_has_conversations
    type: data.set
    with:
      has_conversations: "\${{ steps.get_recent_conversations.error == null and steps.get_recent_conversations.output.hits.total.value > 0 }}"
      conversation_count: "\${{ steps.get_recent_conversations.output.hits.total.value | default: 0 }}"

  - name: scrape_conversations
    type: if
    condition: "\${{ steps.check_has_conversations.output.has_conversations }}"
    steps:
      - name: extract_knowledge
        type: ai.agent
        agent-id: sigevents.memory.conversation-scraper
        connector-id: ".anthropic-claude-4.6-sonnet-chat_completion"
        create-conversation: true
        with:
          timeout: 1800s
          message: |
            Review the following {{ steps.check_has_conversations.output.conversation_count }} recent conversations and extract any durable knowledge into wiki pages.

            {{ steps.get_recent_conversations.output.hits.hits | json }}
          schema:
            type: object
            properties:
              pages_written:
                type: array
                description: page_name values of pages written or updated.
                items:
                  type: string
              pages_deleted:
                type: array
                description: page_name values of pages soft-deleted.
                items:
                  type: string
              conversations_processed:
                type: integer
                description: Number of conversations that contained extractable knowledge.
              summary:
                type: string
                description: Brief summary of what knowledge was extracted.
            required:
              - pages_written
              - pages_deleted
              - conversations_processed
              - summary
        on-failure:
          continue: false
`,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;
