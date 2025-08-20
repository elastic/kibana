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

export async function cli() {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string) =>
    new Promise<string>((resolve) => rl.question(prompt, resolve));

  try {
    const pluginRelativePath = await question(
      'Enter the relative path to the Kibana plugin directory from the Kibana root: '
    );

    const kibanaRoot = process.cwd();
    const pluginPath = path.resolve(kibanaRoot, pluginRelativePath.trim());
    // eslint-disable-next-line no-console
    console.log(`Analyzing plugin at: ${pluginPath}`);

    await analyzeAndGenerate(pluginPath);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}
