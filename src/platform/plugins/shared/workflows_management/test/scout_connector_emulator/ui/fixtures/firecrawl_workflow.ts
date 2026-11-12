/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const STEPS = [
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
] as const;

/** The names of the steps that call the connector, in order. */
export const FIRECRAWL_STEP_NAMES: readonly string[] = STEPS.map(([name]) => name);

const indent = (lines: string, by: number) =>
  lines
    .split('\n')
    .map((line) => `${' '.repeat(by)}${line}`)
    .join('\n');

const toYaml = (value: Record<string, string | number | boolean>) =>
  Object.entries(value)
    .map(
      ([key, item]) =>
        `${key}: ${typeof item === 'string' && item.includes('{{') ? `"${item}"` : item}`
    )
    .join('\n');

/**
 * A workflow with one step per action of the Firecrawl connector. With `pauseSeconds`, a wait step
 * follows each of them, so what a step returned can be read in the execution view before the next
 * one runs.
 */
export const getFirecrawlWorkflowYaml = (
  connectorId: string,
  { pauseSeconds = 0 }: { pauseSeconds?: number } = {}
): string => {
  const steps = STEPS.flatMap(([name, type, params]) => [
    `  - name: ${name}
    type: ${type}
    connector-id: ${connectorId}
    with:
${indent(toYaml(params), 6)}
`,
    ...(pauseSeconds > 0
      ? [
          `  - name: pause_after_${name}
    type: wait
    with:
      duration: ${pauseSeconds}s
`,
        ]
      : []),
  ]);
  return `name: Firecrawl through the connector emulator
description: Runs every action of the Firecrawl connector, which the connector emulator answers
enabled: true
triggers:
  - type: manual
steps:
${steps.join('\n')}`;
};
