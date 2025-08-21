/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { analyzeAndGenerate } from './test_generator';

interface PluginDetails {
  path: string;
  purpose: string;
  features: string[];
  testTypes: string[];
  complexity: 'simple' | 'medium' | 'complex';
  userInteractions: string[];
  apiEndpoints: string[];
}

export async function cli() {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string) =>
    new Promise<string>((resolve) => rl.question(prompt, resolve));

  const multilineQuestion = async (prompt: string): Promise<string[]> => {
    // eslint-disable-next-line no-console
    console.log(prompt);
    // eslint-disable-next-line no-console
    console.log('(Enter each item on a new line, type "done" when finished)');
    const items: string[] = [];
    let input = '';
    while (input.toLowerCase() !== 'done') {
      input = await question('> ');
      if (input.toLowerCase() !== 'done' && input.trim()) {
        items.push(input.trim());
      }
    }
    return items;
  };

  try {
    // eslint-disable-next-line no-console
    console.log('🚀 Kibana Plugin Test Generator');
    // eslint-disable-next-line no-console
    console.log('================================\n');

    const pluginRelativePath = await question(
      'Enter the relative path to the Kibana plugin directory from the Kibana root: '
    );

    const kibanaRoot = process.cwd();
    const pluginPath = path.resolve(kibanaRoot, pluginRelativePath.trim());

    // eslint-disable-next-line no-console
    console.log(`\nAnalyzing plugin at: ${pluginPath}\n`);

    // Gather detailed information about the plugin
    const pluginDetails: PluginDetails = {
      path: pluginPath,
      purpose: '',
      features: [],
      testTypes: [],
      complexity: 'medium',
      userInteractions: [],
      apiEndpoints: [],
    };

    // Ask about plugin purpose
    pluginDetails.purpose = await question(
      'Describe the main purpose of this plugin (e.g., "data visualization", "security management", "search interface"): '
    );

    // Ask about key features
    pluginDetails.features = await multilineQuestion('List the key features of this plugin:');

    // Ask about test types
    const testTypesInput = await question(
      'Which types of tests would you like to generate? (ui, api, both) [both]: '
    );
    const testTypesStr = testTypesInput.trim().toLowerCase() || 'both';

    if (testTypesStr === 'both') {
      pluginDetails.testTypes = ['ui', 'api'];
    } else if (testTypesStr === 'ui' || testTypesStr === 'api') {
      pluginDetails.testTypes = [testTypesStr];
    } else {
      pluginDetails.testTypes = ['ui', 'api'];
    }

    // Ask about complexity
    const complexityInput = await question(
      'Plugin complexity level? (simple, medium, complex) [medium]: '
    );
    pluginDetails.complexity = (complexityInput.trim() as any) || 'medium';

    // Ask about user interactions (for UI tests)
    if (pluginDetails.testTypes.includes('ui')) {
      pluginDetails.userInteractions = await multilineQuestion(
        'Describe typical user interactions with this plugin:'
      );
    }

    // Ask about API endpoints (for API tests)
    if (pluginDetails.testTypes.includes('api')) {
      pluginDetails.apiEndpoints = await multilineQuestion(
        'List API endpoints or functionality this plugin provides:'
      );
    }

    // eslint-disable-next-line no-console
    console.log('\n📊 Plugin Analysis Summary:');
    // eslint-disable-next-line no-console
    console.log(`Purpose: ${pluginDetails.purpose}`);
    // eslint-disable-next-line no-console
    console.log(`Features: ${pluginDetails.features.join(', ')}`);
    // eslint-disable-next-line no-console
    console.log(`Test Types: ${pluginDetails.testTypes.join(', ')}`);
    // eslint-disable-next-line no-console
    console.log(`Complexity: ${pluginDetails.complexity}`);

    const proceed = await question('\nProceed with test generation? (y/n) [y]: ');
    if (proceed.toLowerCase() === 'n') {
      // eslint-disable-next-line no-console
      console.log('Test generation cancelled.');
      return;
    }

    // eslint-disable-next-line no-console
    console.log('\n🔄 Generating tests...\n');

    await analyzeAndGenerate(pluginDetails.path, pluginDetails);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}
