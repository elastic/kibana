/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { writeFileSync } from 'fs';
import { getDependencyOwnership } from './dependency_ownership';

function generateReport(format: unknown) {
  if (typeof format !== 'string') {
    throw createFailError('format must be a string');
  }
  const dependencyOwnership = getDependencyOwnership();

  let reportOutput = '';

  if (format === 'json') {
    reportOutput = JSON.stringify(dependencyOwnership, null, 2);
  } else if (format === 'markdown') {
    reportOutput =
      `| Dependency | Scope | Owner | \n | ---------- | ----- | ----- | \n` +
      dependencyOwnership
        .map(({ dependency, scope, owner }) => `| ${dependency} | ${scope} | ${owner} |`)
        .join('\n');
  } else if (format === 'csv') {
    reportOutput = 'Package,Scope,Owner\n';

    dependencyOwnership.forEach(({ dependency, scope, owner }) => {
      reportOutput += `${dependency},${scope},${owner}\n`;
    });
  } else if (format === 'tsv') {
    reportOutput = 'Package\tScope\tOwner\n';

    dependencyOwnership.forEach(({ dependency, scope, owner }) => {
      reportOutput += `${dependency}\t${scope}\t${owner}\n`;
    });
  } else {
    throw createFailError(`Invalid format: ${format}`);
  }
  return reportOutput;
}

function outputReport(report: string, output: unknown) {
  if (Array.isArray(output)) {
    throw createFailError('Only one output file is allowed');
  }
  if (typeof output !== 'string') {
    throw createFailError('output must be a string');
  }
  if (output === 'stdout') {
    // eslint-disable-next-line no-console
    console.log(report);
  } else {
    writeFileSync(output, report);
  }
}

run(
  ({ log, flags }) => {
    log.debug('Generating dependency ownership report with format: %s', flags.format);
    const report = generateReport(flags.format);
    log.debug('Writing report to %s', flags.output);
    outputReport(report, flags.output);
    log.success(`Dependency ownership report written to ${flags.output}`);
  },
  {
    usage: 'node scripts/generate_depdendency_ownership_report',
    description: 'Generate a report of all dependency ownership based on renovate.json rules',
    flags: {
      string: ['output', 'format'],
      default: {
        output: 'stdout',
        format: 'csv',
      },
      alias: {
        o: 'output',
        f: 'format',
      },
      examples: [
        `node scripts/generate_dependency_ownership_report --format json`,
        `node scripts/generate_dependency_ownership_report --output report.csv`,
        `node scripts/generate_dependency_ownership_report --format markdown --output report.md`,
      ].join(','),
      help: `
        --format, -f   The format of the report (csv, tsv, json, markdown). Default is csv
        --output, -o   Write the report to a file instead of stdout
      `,
    },
  }
);
