/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { WebClient } = require('@slack/web-api');
const { parseArgs } = require('util');

const MISSION_CONTROL_CHANNEL_ID = 'C0JFN9HJL';
const HISTORY_LIMIT = 100;

const VALID_TYPES = ['patch', 'minor'];

function printUsage(out) {
  out(
    'Usage: node notify.js --version <version> --type <patch|minor> [--dry-run]\n' +
      '\n' +
      '  --version   Kibana version, e.g. 9.1.0\n' +
      '  --type      Type of event:\n' +
      '                patch   - Kibana has been version-bumped\n' +
      '                minor   - Kibana branch cut completed\n' +
      '  --dry-run   Print what would be posted without sending anything\n' +
      '  --help      Show this help message\n'
  );
}

function parseCLIArgs(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      version: { type: 'string' },
      type: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  return {
    version: values.version,
    type: values.type,
    dryRun: values['dry-run'],
    help: values.help,
  };
}

function buildMessage(version, type) {
  switch (type) {
    case 'patch':
      return `Kibana v${version} has been bumped.`;
    case 'minor':
      return `Kibana v${version} has been branched out.`;
    default:
      throw new Error(`Unhandled type: ${type}`);
  }
}

async function findFreezeThread(client, version) {
  const result = await client.conversations.history({
    channel: MISSION_CONTROL_CHANNEL_ID,
    limit: HISTORY_LIMIT,
  });

  for (const msg of result.messages ?? []) {
    const text = (msg.text ?? '').toLowerCase();
    if (text.includes(version.toLowerCase()) && text.includes('kibana')) {
      return msg;
    }
  }

  return null;
}

const args = parseCLIArgs(process.argv.slice(2));

if (args.help) {
  printUsage(console.log);
  process.exit(0);
}

if (!args.version || !args.type) {
  printUsage(console.error);
  process.exit(1);
}

if (!args.dryRun && !process.env.SLACK_BOT_TOKEN) {
  console.error(
    'SLACK_BOT_TOKEN is not set. Add it to a .env file or export it in your environment.'
  );
  process.exit(1);
}
if (!VALID_TYPES.includes(args.type)) {
  console.error(`Invalid --type "${args.type}". Must be one of: ${VALID_TYPES.join(', ')}`);
  process.exit(1);
}

(async () => {
  const message = buildMessage(args.version, args.type);

  if (args.dryRun) {
    console.log('[dry-run] Would search for a feature-freeze thread matching:');
    console.log(`  channel : #mission-control (${MISSION_CONTROL_CHANNEL_ID})`);
    console.log(`  version : ${args.version}`);
    console.log(`  keywords: "kibana", "${args.version}"`);
    console.log('[dry-run] Would post message:');
    console.log(`  "${message}"`);
    return;
  }

  const client = new WebClient(process.env.SLACK_BOT_TOKEN);

  const freezeThread = await findFreezeThread(client, args.version);

  if (!freezeThread) {
    console.error(`No feature-freeze thread found for v${args.version} in #mission-control.`);
    process.exit(1);
  }

  console.log(`Found feature-freeze thread (ts=${freezeThread.ts}), replying in thread.`);

  await client.chat.postMessage({
    channel: MISSION_CONTROL_CHANNEL_ID,
    thread_ts: freezeThread.ts,
    text: message,
  });

  console.log(`Posted to #mission-control: "${message}"`);
})().catch((err) => {
  console.error('Failed to post message:', err.message);
  process.exit(1);
});
