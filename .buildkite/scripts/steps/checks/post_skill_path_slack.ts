/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import * as https from 'https';

interface Finding {
  file: string;
  line: number;
  token: string;
}

interface Report {
  findings?: Finding[];
}

function parseArgs(argv: string[]): { reportPath: string; channel: string } {
  const args = argv.slice(2);
  let reportPath = '';
  let channel = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--report' && args[i + 1]) {
      reportPath = args[++i];
    } else if (args[i] === '--channel' && args[i + 1]) {
      channel = args[++i];
    }
  }

  return { reportPath, channel };
}

function postSlackMessage(token: string, channel: string, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ channel, text });
    const options: https.RequestOptions = {
      hostname: 'slack.com',
      path: '/api/chat.postMessage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.ok) {
            console.error(`Slack API error: ${parsed.error}`);
          } else {
            console.log('Slack message posted successfully');
          }
        } catch {
          console.error('Failed to parse Slack API response');
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

async function main() {
  const { reportPath, channel } = parseArgs(process.argv);

  if (!reportPath || !channel) {
    console.error('Usage: post_skill_path_slack.ts --report <path> --channel <channel-id>');
    process.exit(0);
  }

  const token = process.env.SKILL_PATH_SLACK_TOKEN;
  if (!token) {
    console.warn('Warning: SKILL_PATH_SLACK_TOKEN is not set — skipping Slack notification');
    process.exit(0);
  }

  let report: Report;
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch (err) {
    console.error(`Failed to read report at ${reportPath}:`, err);
    process.exit(0);
  }

  const findings: Finding[] = report.findings ?? [];
  const count = findings.length;

  if (count === 0) {
    console.log('No findings in report — nothing to post');
    process.exit(0);
  }

  const MAX_SHOWN = 20;
  const shown = findings.slice(0, MAX_SHOWN);
  const bullets = shown.map((f) => `• ${f.file}:${f.line} — \`${f.token}\``).join('\n');
  const truncationNote = count > MAX_SHOWN ? `\nand ${count - MAX_SHOWN} more...` : '';

  const buildUrl = process.env.BUILDKITE_BUILD_URL ?? '(local)';

  const text = [
    `:warning: Skill path drift detected — ${count} stale path(s) found`,
    '',
    'Files affected:',
    bullets + truncationNote,
    '',
    'Run `node scripts/check_skill_paths` locally to reproduce.',
    `Build: ${buildUrl}`,
  ].join('\n');

  try {
    await postSlackMessage(token, channel, text);
  } catch (err) {
    console.error('Failed to post Slack message:', err);
    // Safe-fail: exit 0 so CI stays green
  }

  process.exit(0);
}

main();
