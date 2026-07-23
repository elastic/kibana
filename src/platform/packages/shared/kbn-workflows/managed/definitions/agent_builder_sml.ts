/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../types';

export const SML_DASHBOARD_INGESTION_WORKFLOW_ID = 'system-agent-builder-sml-dashboard-ingestion';

/**
 * Ingests dashboard knowledge items into the SML/KI index by calling Elasticsearch
 * (and the saved-objects HTTP API) directly — replacing the bespoke `dashboard` SML
 * crawler type. It writes the SAME doc shape the crawler produced (see
 * `agent_builder_dashboards/server/sml_types/dashboard.ts`), so the composite DLS on the
 * "Elastic" ai-index scopes the results identically.
 *
 * IDENTITY: workflow steps run under the workflow's Task-Manager-managed API key, NOT the
 * internal Kibana user. To enumerate every dashboard in every space and write the KI index,
 * that identity must be a privileged/service-account role with all-spaces `read` on the
 * `dashboard` saved-object type and `write` on `ai-index-idx-sml-data`. This mirrors the
 * crawler's internal-user reach (ingestion has always seen everything); per-user visibility
 * is still enforced at retrieval by the DLS on each KI's `spaces`/`permissions`.
 *
 * NOTE (draft): `content` here is simplified to the title. The crawler's richer
 * panel/section summary isn't expressible in workflow templating today and is a follow-up.
 */
export const SML_DASHBOARD_INGESTION_WORKFLOW = {
  id: SML_DASHBOARD_INGESTION_WORKFLOW_ID,
  pluginId: 'agentBuilderSml',
  version: 1,
  billable: false,
  yaml: `name: SML Dashboard Ingestion
enabled: true
triggers:
  - type: scheduled
    with:
      every: "30m"
  - type: manual
steps:
  # Enumerate every dashboard across every space. Runs under the workflow's
  # service-account API key, which must hold all-spaces read on 'dashboard'.
  - name: find_dashboards
    type: http
    with:
      method: POST
      url: "/api/saved_objects/_find"
      body:
        type: dashboard
        per_page: 1000
        fields: ["title"]
        namespaces: ["*"]
  # One KI doc per dashboard, preserving the exact security fields the DLS scopes on:
  #   spaces        = the saved object's raw namespaces (['marketing'], or ['*'] global)
  #   permissions   = saved_object:dashboard/get
  # Deterministic _id from origin.uri makes this an idempotent overwrite (no delete needed).
  - name: index_dashboard_kis
    type: foreach
    foreach: "{{ steps.find_dashboards.output.saved_objects | json }}"
    steps:
      - name: index_ki
        type: elasticsearch.index
        with:
          index: "ai-index-idx-sml-data"
          id: "dashboard://{{ foreach.item.id }}"
          document:
            id: "dashboard://{{ foreach.item.id }}"
            type: dashboard
            title: "{{ foreach.item.attributes.title }}"
            content: "{{ foreach.item.attributes.title }}"
            origin:
              uri: "dashboard://{{ foreach.item.id }}"
            spaces: "{{ foreach.item.namespaces | json }}"
            permissions:
              kibana:
                privileges:
                  - name: "saved_object:dashboard/get"
            ingestion_method: crawled
            discovery_labels:
              - value: "{{ foreach.item.attributes.title }}"
                kind: title
              - value: dashboard
                kind: type
`,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
