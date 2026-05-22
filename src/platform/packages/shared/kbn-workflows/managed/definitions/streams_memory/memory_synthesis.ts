/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../types';

export const STREAMS_MEMORY_SYNTHESIS_WORKFLOW_ID = 'system-streams-memory-synthesis';

export const STREAMS_MEMORY_SYNTHESIS_WORKFLOW = {
  id: STREAMS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  pluginId: 'streams',
  version: 1,
  yaml: `version: "1"

name: Memory Synthesis
description: >
  Synthesizes significant events knowledge indicators into wiki pages using the
  sigevents.memory.synthesizer agent. The agent reads existing pages and insights
  via ES|QL tools and writes updates via the memory_write tool.
enabled: true
settings:
  timeout: "30m"
  concurrency:
    key: "streams-sigevents-memory"
    strategy: drop
    max: 1
tags:
  - observability
  - streams
  - sigevents
  - memory

triggers:
  - type: manual

steps:
  - name: synthesize_memory
    type: ai.agent
    agent-id: sigevents.memory.synthesizer
    connector-id: ".anthropic-claude-4.6-sonnet-chat_completion"
    create-conversation: true
    with:
      timeout: 1800s
      message: |
        Review the current state of the memory wiki and the latest significant events insights, then synthesize new or updated wiki pages.
      schema:
        type: object
        properties:
          pages_written:
            type: array
            description: page_name values of pages written or updated in this run.
            items:
              type: string
          pages_deleted:
            type: array
            description: page_name values of pages soft-deleted in this run.
            items:
              type: string
          summary:
            type: string
            description: Brief summary of what was synthesized and why.
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
