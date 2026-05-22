/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../types';

export const STREAMS_MEMORY_CONSOLIDATION_WORKFLOW_ID = 'system-streams-memory-consolidation';

export const STREAMS_MEMORY_CONSOLIDATION_WORKFLOW = {
  id: STREAMS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  pluginId: 'streams',
  version: 1,
  yaml: `version: "1"

name: Memory Consolidation
description: >
  Curates the memory wiki by merging duplicates, removing stale entries,
  improving categorization, and adding cross-references. Runs on a 24h schedule.
enabled: true
settings:
  timeout: "30m"
  concurrency:
    key: "streams-sigevents-memory-consolidation"
    strategy: drop
    max: 1
tags:
  - observability
  - streams
  - sigevents
  - memory
  - consolidation

triggers:
  - type: scheduled
    with:
      every: "24h"

steps:
  - name: consolidate_memory
    type: ai.agent
    agent-id: sigevents.memory.consolidator
    connector-id: ".anthropic-claude-4.6-sonnet-chat_completion"
    create-conversation: true
    with:
      timeout: 1800s
      message: |
        Review the current state of the memory wiki. Start by listing all pages, then work through them methodically. Not every page needs changes — focus on the highest-impact improvements.
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
          summary:
            type: string
            description: Brief summary of what was changed and why.
        required:
          - pages_written
          - pages_deleted
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
