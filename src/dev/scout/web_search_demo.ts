/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Demo script showing the web search integration for Kibana feature descriptions
 *
 * This demonstrates how the enhanced MultiStepTestGenerator:
 * 1. Searches for real Kibana feature descriptions online
 * 2. Prompts users to confirm or adjust descriptions
 * 3. Uses the enhanced information to generate better tests
 */

import type { PluginDetails } from './multi_step_prompting';
import { MultiStepTestGenerator } from './multi_step_prompting';

async function demonstrateWebSearchIntegration() {
  // eslint-disable-next-line no-console
  console.log('🚀 Web Search Integration Demo for Kibana Test Generation\n');

  const generator = new MultiStepTestGenerator();

  // Example 1: Console plugin
  const consolePluginDetails: PluginDetails = {
    path: 'src/platform/plugins/shared/console',
    purpose: 'console app in dev tools for elasticsearch queries',
    features: ['query editor', 'elasticsearch api', 'dev tools'],
    testTypes: ['ui'],
    complexity: 'medium' as const,
    userInteractions: ['type queries', 'execute requests', 'view responses'],
    apiEndpoints: [],
    supportsSpaces: false,
    useParallelTesting: false,
  };

  const consoleMeta = {
    plugin: {
      id: 'console',
    },
  };

  // eslint-disable-next-line no-console
  console.log('Example 1: Console Plugin');
  // eslint-disable-next-line no-console
  console.log('========================');
  // eslint-disable-next-line no-console
  console.log('Original purpose:', consolePluginDetails.purpose);
  // eslint-disable-next-line no-console
  console.log('');

  try {
    // This will:
    // 1. Search for "Kibana console console app in dev tools for elasticsearch queries feature documentation Elastic Stack"
    // 2. Present the search results to the user
    // 3. Ask for confirmation or allow manual adjustment
    // 4. Use the enhanced description for better test generation
    const analysis = await generator.analyzePlugin(consolePluginDetails, consoleMeta);

    // eslint-disable-next-line no-console
    console.log('\n📊 Analysis Results:');
    // eslint-disable-next-line no-console
    console.log('Summary:', analysis.summary);
    // eslint-disable-next-line no-console
    console.log('Category:', analysis.category);
    // eslint-disable-next-line no-console
    console.log('Web Description:', analysis.webSearchDescription || 'None');
    // eslint-disable-next-line no-console
    console.log('Use Cases:', analysis.estimatedUseCases.join(', '));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Demo failed:', error);
  }
}

/**
 * Example of what the enhanced workflow looks like:
 *
 * 1. User provides plugin info: "console app in dev tools"
 *
 * 2. System searches web for: "Kibana console console app in dev tools feature documentation Elastic Stack"
 *
 * 3. System presents results like:
 *    🔍 Web Search Result:
 *    📝 Description: The Kibana Console is an interactive development tool that allows users to send requests to Elasticsearch directly from the Kibana interface. It provides syntax highlighting, auto-completion, and request history for writing and testing Elasticsearch queries and APIs.
 *    📂 Category: Console
 *    🔧 Key Features: Interactive query editor, Elasticsearch API testing, Syntax highlighting, Auto-completion, Request history
 *    🔍 Search Query: Kibana console console app in dev tools feature documentation Elastic Stack
 *
 * 4. User can:
 *    - Type 'y' to accept
 *    - Type 'n' to reject and provide their own
 *    - Directly type a better description
 *
 * 5. System uses the confirmed description to generate more accurate tests
 */

if (require.main === module) {
  demonstrateWebSearchIntegration().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Demo error:', error);
    process.exit(1);
  });
}

export { demonstrateWebSearchIntegration };
