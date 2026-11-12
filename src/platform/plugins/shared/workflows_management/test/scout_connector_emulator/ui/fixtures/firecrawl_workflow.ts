/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A workflow with one step per action of the Firecrawl connector. The crawl's id goes from the
 * crawl step to the one that asks for its status.
 */
export const getFirecrawlWorkflowYaml = (
  connectorId: string
): string => `name: Firecrawl through the connector emulator
description: Runs every action of the Firecrawl connector, which the connector emulator answers
enabled: true
triggers:
  - type: manual
steps:
  - name: scrape
    type: firecrawl.scrape
    connector-id: ${connectorId}
    with:
      url: https://example.com
      onlyMainContent: true

  - name: search
    type: firecrawl.search
    connector-id: ${connectorId}
    with:
      query: kibana
      limit: 3

  - name: map
    type: firecrawl.map
    connector-id: ${connectorId}
    with:
      url: https://example.com
      search: docs
      limit: 5

  - name: crawl
    type: firecrawl.crawl
    connector-id: ${connectorId}
    with:
      url: https://example.com
      limit: 2

  - name: get_crawl_status
    type: firecrawl.getCrawlStatus
    connector-id: ${connectorId}
    with:
      id: "{{ steps.crawl.output.id }}"

  - name: crawl_and_wait
    type: firecrawl.crawlAndWait
    connector-id: ${connectorId}
    with:
      url: https://example.com
      pollIntervalMs: 1000
      maxWaitMs: 30000
`;
