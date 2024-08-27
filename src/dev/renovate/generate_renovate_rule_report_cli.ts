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
import { getUnusedRenovateRules } from './dependency_ownership';

function generateReport(format: unknown) {
  if (typeof format !== 'string') {
    throw createFailError('format must be a string');
  }
  const unusedRules = getUnusedRenovateRules();

  let reportOutput = '';

  if (format === 'json') {
    reportOutput = JSON.stringify(unusedRules, null, 2);
  } else if (format === 'markdown') {
    reportOutput = `| Rule | \n | ---- | \n` + unusedRules.map((rule) => `| ${rule} |`).join('\n');
  } else if (format === 'csv') {
    reportOutput = 'Rule\n';

    unusedRules.forEach((rule) => {
      reportOutput += `${JSON.stringify(rule)}\n`;
    });
  } else if (format === 'tsv') {
    reportOutput = 'Rule\n';

    unusedRules.forEach((rule) => {
      reportOutput += `${JSON.stringify(rule)}\n`;
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
    log.debug('Generating renovate rule report format: %s', flags.format);
    const report = generateReport(flags.format);
    log.debug('Writing report to %s', flags.output);
    outputReport(report, flags.output);
    log.success(`Report written to ${flags.output}`);
  },
  {
    usage: 'node scripts/generate_renovate_rule_report',
    description: 'Generate a report of all renovate rules that do not match any dependencies',
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
        `node scripts/generate_renovate_rule_report --format json`,
        `node scripts/generate_renovate_rule_report --output report.csv`,
        `node scripts/generate_renovate_rule_report --format markdown --output report.md`,
      ].join(','),
      help: `
        --format, -f   The format of the report (csv, tsv, json, markdown). Default is csv
        --output, -o   Write the report to a file instead of stdout
      `,
    },
  }
);
