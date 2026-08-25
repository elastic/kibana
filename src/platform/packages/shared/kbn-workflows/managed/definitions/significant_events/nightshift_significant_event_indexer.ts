/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../types';

export const NIGHTSHIFT_SIGNIFICANT_EVENT_INDEXER_WORKFLOW_ID =
  'system-nightshift-significant-event-indexer';

const YAML = `
version: "1"

name: Nightshift Significant Event Indexer
description: >
  Queries recently changed significant events and writes summarized
  type:significant_event docs into ai-index-ds-nightshift via create_ki/update_ki/delete_ki.
enabled: false
settings:
  timeout: "5m"
  concurrency:
    key: "nightshift-significant-event-indexer"
    strategy: drop
    max: 1
tags:
  - observability
  - significant-events
  - nightshift

triggers:
  - type: scheduled
    with:
      every: "2m"

steps:
  - name: index_significant_events
    type: ai.agent
    with:
      prompt: >
        Query recently changed significant events from .significant_events-events
        and upsert type:significant_event knowledge items into ai-index-ds-nightshift
        using create_ki and update_ki tools. Delete stale items with delete_ki.
`.trim();

export const NIGHTSHIFT_SIGNIFICANT_EVENT_INDEXER_WORKFLOW = {
  id: NIGHTSHIFT_SIGNIFICANT_EVENT_INDEXER_WORKFLOW_ID,
  pluginId: 'significant_events',
  version: 1,
  billable: false,
  yaml: YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;
