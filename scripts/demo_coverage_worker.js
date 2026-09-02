/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Seeds demo rules for the Detection Coverage Worker demo.
 *
 * Usage:
 *   node scripts/demo_coverage_worker.js [--url http://localhost:5601] [--user elastic] [--password changeme]
 *   node scripts/demo_coverage_worker.js --clean   # removes demo rules only
 *
 * After seeding, trigger the Detection Coverage Worker workflow with these inputs:
 *
 *  Scenario A — covered_enabled (no approval gate)
 *    gap_description: "Suspicious PowerShell with -EncodedCommand flag on Windows endpoints"
 *    technique: T1059
 *
 *  Scenario B — covered_disabled (pauses at "Enable rule" approval)
 *    gap_description: "Lateral movement via SMB file shares between Windows hosts"
 *    technique: T1021
 *
 *  Scenario C — no_coverage (dispatches rule creation)
 *    gap_description: "SSH brute-force login attempts from external IPs against Linux servers"
 *    technique: T1110
 *
 * For prebuilt_available: install the security_detection_engine package but leave
 * a specific rule uninstalled. The workflow will find it and pause at "Install rule".
 */

const RULES_URL = '/api/detection_engine/rules';
const API_VERSION = '2023-10-31';

const DEMO_RULES = [
  {
    name: '[DEMO] Suspicious PowerShell Execution',
    description:
      'Detects suspicious PowerShell process execution using -EncodedCommand flag on Windows endpoints',
    query: 'process.name:powershell.exe and process.args:*-enc*',
    index: ['logs-endpoint.events.*'],
    enabled: true,
    severity: 'critical',
    risk_score: 99,
    tags: ['MITRE', 'OS: Windows', 'DEMO'],
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0002',
          name: 'Execution',
          reference: 'https://attack.mitre.org/tactics/TA0002/',
        },
        technique: [
          {
            id: 'T1059',
            name: 'Command and Scripting Interpreter',
            reference: 'https://attack.mitre.org/techniques/T1059/',
          },
        ],
      },
    ],
  },
  {
    name: '[DEMO] Lateral Movement via SMB',
    description: 'Detects lateral movement via SMB connections between Windows hosts',
    query: 'event.code:5145 and network.protocol:smb',
    index: ['winlogbeat-*'],
    enabled: false,
    severity: 'high',
    risk_score: 70,
    tags: ['MITRE', 'Domain: Network', 'DEMO'],
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0008',
          name: 'Lateral Movement',
          reference: 'https://attack.mitre.org/tactics/TA0008/',
        },
        technique: [
          {
            id: 'T1021',
            name: 'Remote Services',
            reference: 'https://attack.mitre.org/techniques/T1021/',
          },
        ],
      },
    ],
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    url: 'http://localhost:5601',
    user: 'elastic',
    password: 'changeme',
    clean: false,
    space: 'default',
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url') opts.url = args[++i];
    else if (args[i] === '--user') opts.user = args[++i];
    else if (args[i] === '--password') opts.password = args[++i];
    else if (args[i] === '--space') opts.space = args[++i];
    else if (args[i] === '--clean') opts.clean = true;
  }
  return opts;
}

async function kibanaRequest(opts, method, path, body) {
  const base = opts.space === 'default' ? opts.url : `${opts.url}/s/${opts.space}`;
  const auth = Buffer.from(`${opts.user}:${opts.password}`).toString('base64');
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      'kbn-xsrf': 'true',
      'elastic-api-version': API_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function findDemoRules(opts) {
  const res = await kibanaRequest(
    opts,
    'GET',
    `${RULES_URL}/_find?per_page=100&filter=alert.attributes.tags:DEMO`
  );
  const json = await res.json();
  return (json.data ?? []).filter((r) => r.name.startsWith('[DEMO]'));
}

async function clean(opts) {
  console.log('Removing demo rules...');
  const rules = await findDemoRules(opts);
  for (const rule of rules) {
    await kibanaRequest(opts, 'DELETE', `${RULES_URL}?id=${rule.id}`);
    console.log(`  deleted: ${rule.name}`);
  }
  console.log(`Done. Removed ${rules.length} demo rule(s).`);
}

async function seed(opts) {
  console.log('Removing stale demo rules...');
  const stale = await findDemoRules(opts);
  for (const rule of stale) {
    await kibanaRequest(opts, 'DELETE', `${RULES_URL}?id=${rule.id}`);
  }

  console.log('Creating demo rules...');
  for (const rule of DEMO_RULES) {
    const body = {
      ...rule,
      type: 'query',
      language: 'kuery',
      interval: '5m',
      from: 'now-6m',
      to: 'now',
      author: [],
      false_positives: [],
      references: [],
      actions: [],
    };
    const res = await kibanaRequest(opts, 'POST', RULES_URL, body);
    const json = await res.json();
    if (res.ok) {
      const status = rule.enabled ? 'ENABLED' : 'DISABLED';
      console.log(`  created [${status}]: ${rule.name}`);
    } else {
      console.error(`  FAILED: ${rule.name} — ${JSON.stringify(json.message ?? json)}`);
    }
  }

  console.log('\n--- Demo ready ---\n');
  console.log('Trigger the "Detection Coverage Worker" workflow with these inputs:\n');
  console.log('Scenario A — covered_enabled (no approval gate):');
  console.log(
    '  gap_description: "Suspicious PowerShell with -EncodedCommand flag on Windows endpoints"'
  );
  console.log('  technique: T1059\n');
  console.log('Scenario B — covered_disabled (pauses at "Enable rule" approval):');
  console.log('  gap_description: "Lateral movement via SMB file shares between Windows hosts"');
  console.log('  technique: T1021\n');
  console.log('Scenario C — no_coverage (dispatches rule creation):');
  console.log(
    '  gap_description: "SSH brute-force login attempts from external IPs against Linux servers"'
  );
  console.log('  technique: T1110\n');
  console.log('Scenario D — prebuilt_available (pauses at "Install rule" approval):');
  console.log(
    '  Requires: security_detection_engine package installed with at least one rule not yet activated.'
  );
  console.log('  Use a gap that matches a known prebuilt rule name/description.\n');
}

async function main() {
  const opts = parseArgs();
  console.log(`Target: ${opts.url} (space: ${opts.space})\n`);
  try {
    if (opts.clean) {
      await clean(opts);
    } else {
      await seed(opts);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
