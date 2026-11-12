/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorStep } from './connector_workflow';
import { getConnectorWorkflowYaml } from './connector_workflow';

const STEPS: readonly ConnectorStep[] = [
  ['scrape', 'firecrawl.scrape', { url: 'https://example.com', onlyMainContent: true }],
  ['search', 'firecrawl.search', { query: 'kibana', limit: 3 }],
  ['map', 'firecrawl.map', { url: 'https://example.com', search: 'docs', limit: 5 }],
  ['crawl', 'firecrawl.crawl', { url: 'https://example.com', limit: 2 }],
  // The crawl's id goes from the crawl step to the one that asks for its status.
  ['get_crawl_status', 'firecrawl.getCrawlStatus', { id: '{{ steps.crawl.output.id }}' }],
  [
    'crawl_and_wait',
    'firecrawl.crawlAndWait',
    { url: 'https://example.com', pollIntervalMs: 1000, maxWaitMs: 30000 },
  ],
];

/** The names of the steps that call the connector, in order. */
export const FIRECRAWL_STEP_NAMES: readonly string[] = STEPS.map(([name]) => name);

export const getFirecrawlWorkflowYaml = (
  connectorId: string,
  { pauseSeconds = 0 }: { pauseSeconds?: number } = {}
): string =>
  getConnectorWorkflowYaml({ title: 'Firecrawl', connectorId, steps: STEPS, pauseSeconds });
