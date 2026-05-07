/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeFile } from 'node:fs/promises';
import type { AuditResult, AuditStatus, EndpointId, Persona, PersonaBrowserResult } from './types';
import { collectFlyoutResults } from './correlate';
import { PRIVILEGE_ENDPOINT_PATHS } from './endpoints';
import { TEST_ENTITY_NAME } from './seed';

const STATUS_ICON: Record<AuditStatus | 'SKIP', string> = {
  PASS: '✅ PASS',
  API_ONLY: '⚠️ NO SELECTORS',
  FAIL: '❌ FAIL',
  ERROR: '🔴 ERROR',
  SKIP: '⏭️ SKIP',
};

const fmtBool = (v: boolean | null): string => {
  if (v === null) return '—';
  return v ? '✓ yes' : '✗ no';
};

const row = (cells: string[]): string => `| ${cells.join(' | ')} |`;
const sep = (n: number): string => `|${Array(n).fill('---').join('|')}|`;
const h1 = (s: string): string => `# ${s}`;
const h2 = (s: string): string => `## ${s}`;
const divider = (): string => '\n---\n';

// ─── Network wiring check ─────────────────────────────────────────────────────

/**
 * Shows which privilege endpoints the browser actually called during page renders.
 * A missing entry means the UI never called that endpoint — possible wiring gap.
 */
const buildNetworkWiringSection = (
  personas: Persona[],
  browserResults: PersonaBrowserResult[]
): string[] => {
  const lines: string[] = [];
  lines.push(h2('Network Wiring (UI → Privilege Endpoints)'));
  lines.push(
    '_Privilege API calls intercepted from the browser during page navigation. ' +
      'A ✗ means the UI never called that endpoint — possible missing privilege check._\n'
  );

  const endpointIds = Object.keys(PRIVILEGE_ENDPOINT_PATHS) as EndpointId[];
  const resultIndex = new Map(browserResults.map((r) => [r.personaId, r]));

  lines.push(row(['User', ...endpointIds.map((id) => PRIVILEGE_ENDPOINT_PATHS[id])]));
  lines.push(sep(1 + endpointIds.length));

  for (const persona of personas) {
    const pr = resultIndex.get(persona.id);
    const intercepted = pr?.interceptedNetworkCalls ?? {};
    const cells = endpointIds.map((id) => (intercepted[id] !== undefined ? '✓' : '✗'));
    lines.push(row([persona.name, ...cells]));
  }
  lines.push('');
  return lines;
};

// ─── Section 1: API ──────────────────────────────────────────────────────────
// Columns: Endpoint | Permission Field | User | Access | Result

const buildApiSection = (results: AuditResult[]): string[] => {
  const lines: string[] = [];
  lines.push(h2('API'));
  lines.push(
    '_One row per (persona × endpoint × privilege field). ' +
      'Shows whether the privilege endpoint responded correctly._\n'
  );

  // Deduplicate by (personaId, endpoint, privilegeField)
  const seen = new Set<string>();
  const apiRows: Array<{
    fullPath: string;
    field: string;
    personaName: string;
    access: boolean | null;
    status: AuditStatus;
    error?: string;
  }> = [];

  for (const r of results) {
    const key = `${r.persona.id}|${r.endpoint}|${r.privilegeField}`;
    if (seen.has(key)) continue;
    seen.add(key);
    apiRows.push({
      fullPath: PRIVILEGE_ENDPOINT_PATHS[r.endpoint] ?? r.endpoint,
      field: r.privilegeField,
      personaName: r.persona.name,
      access: r.apiValue,
      status: r.apiValue === null ? 'ERROR' : 'PASS',
      error: r.details,
    });
  }

  lines.push(row(['Endpoint', 'Permission Field', 'User', 'Access', 'Result']));
  lines.push(sep(5));
  for (const r of apiRows) {
    lines.push(
      row([
        `\`${r.fullPath}\``,
        `\`${r.field}\``,
        r.personaName,
        fmtBool(r.access),
        r.status === 'ERROR' ? `🔴 ERROR${r.error ? ` — ${r.error.slice(0, 80)}` : ''}` : '✅ PASS',
      ])
    );
  }
  lines.push('');
  return lines;
};

// ─── Section 2: UI ───────────────────────────────────────────────────────────
// Columns: URL | Feature Gate | User | Expected | Result

const fmtExpected = (apiValue: boolean | null): string => {
  if (apiValue === null) return '—';
  return apiValue ? '✓ features visible' : '✗ access blocked';
};

const buildUiSection = (results: AuditResult[]): string[] => {
  const lines: string[] = [];
  lines.push(h2('UI'));
  lines.push(
    '_One row per (persona × feature gate). ' +
      'Checks both granted state (features visible) and denied state (block indicators shown)._\n'
  );

  lines.push(row(['URL', 'Feature Gate', 'User', 'Expected', 'Result']));
  lines.push(sep(5));

  for (const r of results) {
    lines.push(
      row([
        `\`${r.page}\``,
        r.featureName,
        r.persona.name,
        fmtExpected(r.apiValue),
        STATUS_ICON[r.status] ?? r.status,
      ])
    );
  }
  lines.push('');
  return lines;
};

// ─── Section 3: Flyout ───────────────────────────────────────────────────────
// Columns: Entity | Panel | User | API Access | Result

const buildFlyoutSection = (
  personas: Persona[],
  browserResults: PersonaBrowserResult[]
): string[] => {
  const lines: string[] = [];
  lines.push(h2('Flyout'));
  lines.push(
    `_One row per (persona × panel). Entity under test: \`${TEST_ENTITY_NAME}\`. ` +
      'Personas without entity store read access show SKIP._\n'
  );

  const flyoutRows = collectFlyoutResults(personas, browserResults);

  if (flyoutRows.length === 0) {
    lines.push('_No flyout checks were recorded._\n');
    return lines;
  }

  lines.push(row(['Entity', 'Panel', 'User', 'API Access', 'Result']));
  lines.push(sep(5));

  for (const { persona, check } of flyoutRows) {
    const statusLabel =
      check.status === 'SKIP'
        ? STATUS_ICON.SKIP
        : check.status === 'PASS'
        ? STATUS_ICON.PASS
        : check.status === 'FAIL'
        ? STATUS_ICON.FAIL
        : STATUS_ICON.ERROR;
    const fullPath = PRIVILEGE_ENDPOINT_PATHS[check.endpoint] ?? check.endpoint;
    lines.push(
      row([
        `\`${TEST_ENTITY_NAME}\``,
        `${check.panelLabel} (\`${fullPath}\`)`,
        persona.name,
        fmtBool(check.apiValue),
        statusLabel,
      ])
    );
  }
  lines.push('');
  return lines;
};

// ─── Summary ─────────────────────────────────────────────────────────────────

const buildSummary = (
  results: AuditResult[],
  personas: Persona[],
  browserResults: PersonaBrowserResult[]
): string[] => {
  const lines: string[] = [];
  lines.push(h2('Summary'));

  const uiCounts: Record<AuditStatus, number> = { PASS: 0, API_ONLY: 0, FAIL: 0, ERROR: 0 };
  for (const r of results) uiCounts[r.status]++;

  const flyoutRows = collectFlyoutResults(personas, browserResults);
  let flyoutPass = 0;
  let flyoutFail = 0;
  let flyoutSkip = 0;
  let flyoutError = 0;
  for (const { check } of flyoutRows) {
    if (check.status === 'PASS') flyoutPass++;
    else if (check.status === 'FAIL') flyoutFail++;
    else if (check.status === 'SKIP') flyoutSkip++;
    else flyoutError++;
  }

  lines.push(row(['Section', 'PASS', 'FAIL', 'NO SELECTORS', 'ERROR']));
  lines.push(sep(5));
  lines.push(
    row([
      'UI + API',
      String(uiCounts.PASS),
      String(uiCounts.FAIL),
      String(uiCounts.API_ONLY),
      String(uiCounts.ERROR),
    ])
  );
  lines.push(
    row(['Flyout', String(flyoutPass), String(flyoutFail), String(flyoutSkip), String(flyoutError)])
  );
  lines.push('');
  return lines;
};

// ─── Main export ─────────────────────────────────────────────────────────────

export const renderReport = async (
  results: AuditResult[],
  personas: Persona[],
  browserResults: PersonaBrowserResult[],
  knownGaps: string[],
  outputPath: string
): Promise<void> => {
  const timestamp = new Date().toISOString();
  const lines: string[] = [];

  lines.push(h1('Entity Analytics — Permission Audit Report'));
  lines.push(`_Generated: ${timestamp}_\n`);

  lines.push(...buildSummary(results, personas, browserResults));
  lines.push(divider());
  lines.push(...buildNetworkWiringSection(personas, browserResults));
  lines.push(divider());
  lines.push(...buildApiSection(results));
  lines.push(divider());
  lines.push(...buildUiSection(results));
  lines.push(divider());
  lines.push(...buildFlyoutSection(personas, browserResults));
  lines.push(divider());

  lines.push(h2('Known Gaps'));
  for (const gap of knownGaps) {
    lines.push(`- ${gap}`);
  }
  lines.push('');

  await writeFile(outputPath, lines.join('\n'), 'utf-8');
  process.stdout.write(`\nReport written to: ${outputPath}\n`);
};
