/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'node:child_process';
import { formatDuration } from './format_duration';

export function eslintFixGeneratedCode({ paths }: { paths: string[] }) {
  try {
    const startedAt = performance.now();
    console.log(
      '3/3 Running eslint --fix on generated code... Hang tight, it might take a min or two...'
    );
    const command = `npx eslint ${paths.join(' ')} --fix --no-ignore`;
    console.log(`- Running eslint command: ${command}`);
    execSync(command, { stdio: 'inherit' });
    console.log(
      `✅ Generated code fixed and prettified in ${formatDuration(startedAt, performance.now())}`
    );
  } catch (error) {
    console.error('❌ Failed to fix and prettify generated code:', error);
    return false;
  }
}
