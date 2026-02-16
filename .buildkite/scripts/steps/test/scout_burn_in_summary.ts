/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuildkiteClient, upsertComment } from '#pipeline-utils';

type BurnInResult = 'passed' | 'failed' | 'no_tests' | 'unknown';

interface ModuleResult {
  name: string;
  result: BurnInResult;
}

function getResultEmoji(result: BurnInResult): string {
  switch (result) {
    case 'passed':
      return '✅';
    case 'failed':
      return '❌';
    case 'no_tests':
      return '⏭️';
    case 'unknown':
      return '❓';
  }
}

function getResultLabel(result: BurnInResult): string {
  switch (result) {
    case 'passed':
      return 'Passed';
    case 'failed':
      return 'Failed';
    case 'no_tests':
      return 'No tests found';
    case 'unknown':
      return 'Unknown (step may have been cancelled)';
  }
}

function buildCommentBody(moduleResults: ModuleResult[], repeatEach: number): string {
  const buildUrl = process.env.BUILDKITE_BUILD_URL ?? '';
  const totalModules = moduleResults.length;
  const passed = moduleResults.filter((m) => m.result === 'passed').length;
  const failed = moduleResults.filter((m) => m.result === 'failed').length;
  const noTests = moduleResults.filter((m) => m.result === 'no_tests').length;
  const unknown = moduleResults.filter((m) => m.result === 'unknown').length;

  const lines: string[] = [
    '## Scout Burn-in Test Results',
    '',
    `**Repeat count:** ${repeatEach} | **Modules tested:** ${totalModules} | ✅ ${passed} | ❌ ${failed}${
      noTests > 0 ? ` | ⏭️ ${noTests}` : ''
    }${unknown > 0 ? ` | ❓ ${unknown}` : ''}`,
    '',
  ];

  if (buildUrl) {
    lines.push(`[View build](${buildUrl})`);
    lines.push('');
  }

  // Results table
  lines.push('| Module | Result |');
  lines.push('| --- | --- |');

  for (const { name, result } of moduleResults) {
    lines.push(`| \`${name}\` | ${getResultEmoji(result)} ${getResultLabel(result)} |`);
  }

  lines.push('');

  if (failed > 0) {
    lines.push(
      '> **Note:** Burn-in failures indicate potential flakiness introduced by this PR. ' +
        'Please investigate failing modules before merging.'
    );
  } else if (totalModules > 0 && failed === 0) {
    lines.push('> All burn-in tests passed. No flakiness detected.');
  }

  return lines.join('\n');
}

(async () => {
  try {
    const bk = new BuildkiteClient();

    // Read the list of affected modules and repeat count from metadata
    const modulesStr = bk.getMetadata('scout_burn_in_modules');
    const repeatEachStr = bk.getMetadata('scout_burn_in_repeat_each', '2');

    if (!modulesStr) {
      console.log('No burn-in modules found in metadata, skipping summary.');
      return;
    }

    const moduleNames = modulesStr.split(',').filter(Boolean);
    const repeatEach = parseInt(repeatEachStr ?? '2', 10);

    // Collect results for each module
    const moduleResults: ModuleResult[] = moduleNames.map((name) => {
      const result = bk.getMetadata(`scout_burn_in_result_${name}`, 'unknown') as BurnInResult;
      return { name, result };
    });

    console.log('--- Scout Burn-in Summary');
    for (const { name, result } of moduleResults) {
      console.log(`  ${getResultEmoji(result)} ${name}: ${getResultLabel(result)}`);
    }

    // Post PR comment
    const commentBody = buildCommentBody(moduleResults, repeatEach);

    if (process.env.GITHUB_PR_NUMBER) {
      await upsertComment({
        commentBody,
        commentContext: 'scout-burn-in-results',
        clearPrevious: true,
      });
      console.log('PR comment posted successfully.');
    } else {
      console.log('No GITHUB_PR_NUMBER set, skipping PR comment.');
      console.log('--- Comment body that would have been posted:');
      console.log(commentBody);
    }
  } catch (ex) {
    console.error('Scout burn-in summary error:', (ex as Error).message);
    process.exit(1);
  }
})();
