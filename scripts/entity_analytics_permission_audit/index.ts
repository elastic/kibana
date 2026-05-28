/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Entity Analytics Permission Audit Script
 *
 * Runs a set of purpose-built test personas against all EA privilege endpoints,
 * seeds a test entity with risk score / asset criticality / watchlist data,
 * verifies UI behaviour via Playwright, probes the entity flyout for each
 * persona, and renders a compact three-section Markdown report.
 *
 * Usage:
 *   node --require @kbn/babel-register/install \
 *     scripts/entity_analytics_permission_audit/index.ts \
 *     [--kibana-url http://localhost:5601] \
 *     [--es-url http://localhost:9200] \
 *     [--user elastic] \
 *     [--password changeme] \
 *     [--space default] \
 *     [--output entity_analytics_permissions_audit.md] \
 *     [--headed]
 */

import { parseArgs } from 'node:util';
import type { CliArgs, SeedContext } from './types';
import { PERSONAS, createPersona } from './personas';
import { CORRELATION_MAP, FLYOUT_CORRELATION_MAP, KNOWN_GAPS } from './endpoints';
import { probeBrowserForPersonas } from './browser';
import { correlate } from './correlate';
import { renderReport } from './report';
import { cleanupAll, cleanupPersonas } from './cleanup';
import { seedTestEntity } from './seed';
import { toBase64 } from './api';

const parseCliArgs = (): CliArgs => {
  const { values } = parseArgs({
    options: {
      'kibana-url': { type: 'string', default: 'http://localhost:5601' },
      'es-url': { type: 'string', default: 'http://localhost:9200' },
      user: { type: 'string', default: 'elastic' },
      password: { type: 'string', default: 'changeme' },
      space: { type: 'string', default: 'default' },
      output: { type: 'string', default: 'entity_analytics_permissions_audit.md' },
      headed: { type: 'boolean', default: false },
    },
  });
  return {
    kibanaUrl: values['kibana-url'] as string,
    esUrl: values['es-url'] as string,
    user: values.user as string,
    password: values.password as string,
    space: values.space as string,
    output: values.output as string,
    headed: values.headed as boolean,
  };
};

const main = async (): Promise<void> => {
  const args = parseCliArgs();
  const adminAuth = toBase64(`${args.user}:${args.password}`);

  const log = (msg: string) => process.stdout.write(`${msg}\n`);
  const err = (msg: string) => process.stderr.write(`${msg}\n`);

  log(`\nEntity Analytics Permission Audit`);
  log(`  Kibana:  ${args.kibanaUrl}`);
  log(`  ES:      ${args.esUrl}`);
  log(`  Space:   ${args.space}`);
  log(`  Headed:  ${args.headed}`);
  log(`  Output:  ${args.output}\n`);

  // Step 1: Create test roles + users
  log(`[1/4] Creating ${PERSONAS.length} test personas...`);
  try {
    for (const persona of PERSONAS) {
      process.stdout.write(`  Creating ${persona.name}...`);
      await createPersona(args.kibanaUrl, args.esUrl, adminAuth, persona);
      process.stdout.write(' done\n');
    }
  } catch (setupErr) {
    const msg = setupErr instanceof Error ? setupErr.message : String(setupErr);
    err(`\nFailed during persona setup: ${msg}`);
    err('Attempting cleanup before exit...');
    await cleanupPersonas(args.kibanaUrl, args.esUrl, adminAuth, PERSONAS);
    process.exit(1);
  }

  let seedCtx: SeedContext | null = null;

  try {
    // Step 2: Seed the test entity
    log(`\n[2/4] Seeding test entity (ea-audit-test-user)...`);
    seedCtx = await seedTestEntity(args.kibanaUrl, args.esUrl, adminAuth, args.space);

    // Step 3: Browser probe (API calls + DOM checks + flyout probe)
    log(
      `\n[3/4] Running browser probes ` +
        `(${PERSONAS.length} personas × ${CORRELATION_MAP.length} UI checks + ` +
        `${FLYOUT_CORRELATION_MAP.length} flyout panels)...`
    );
    const browserResults = await probeBrowserForPersonas(
      args.kibanaUrl,
      args.space,
      PERSONAS,
      CORRELATION_MAP,
      FLYOUT_CORRELATION_MAP,
      args.headed
    );

    // Step 4: Correlate + render report
    log('\n[4/4] Correlating and rendering report...');
    const auditResults = correlate(PERSONAS, CORRELATION_MAP, browserResults);
    await renderReport(auditResults, PERSONAS, browserResults, KNOWN_GAPS, args.output);
  } finally {
    // Cleanup always runs: personas + seeded entity data
    await cleanupAll(args.kibanaUrl, args.esUrl, adminAuth, args.space, PERSONAS, seedCtx);
  }
};

main().catch((runErr) => {
  process.stderr.write(
    `Unexpected error: ${runErr instanceof Error ? runErr.message : String(runErr)}\n`
  );
  process.exit(1);
});
