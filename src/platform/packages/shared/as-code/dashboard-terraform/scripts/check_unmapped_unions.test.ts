/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { parse } from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';

const execFileAsync = promisify(execFile);

const publishedOas = parse(readFileSync(join(REPO_ROOT, 'oas_docs/output/kibana.yaml'), 'utf8'));
const acceptedJsonLeaves: string[] = JSON.parse(
  readFileSync(join(__dirname, '../src/accepted_json_leaves.json'), 'utf8')
);

const XY_CHART = 'Kibana_HTTP_APIs_visXyChartNoESQL';
// The DSL and ES|QL xy charts are merged into one Terraform object, so the union is located on the merged component.
const HIGHLIGHT = 'Kibana_HTTP_APIs_visXyChart.highlight';
const ACCEPTED_LIST_PATH =
  'src/platform/packages/shared/as-code/dashboard-terraform/src/accepted_json_leaves.json';

// A union of objects that a Kibana developer adds to the xy chart schema.
const highlightUnion = (linePosition = 'at') => ({
  anyOf: [
    {
      type: 'object',
      properties: { kind: { type: 'string', enum: ['band'] }, from: { type: 'number' } },
      required: ['kind'],
    },
    {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['line'] },
        [linePosition]: { type: 'number' },
      },
      required: ['kind'],
    },
  ],
});

const withHighlight = (highlight: Record<string, unknown>) => {
  const doc = structuredClone(publishedOas);
  doc.components.schemas[XY_CHART].properties.highlight = highlight;
  return doc;
};

interface CommandResult {
  code: number;
  output: string;
  /** Contents of the list passed with `--accepted` after the command ran. */
  acceptedAfter?: string;
}

let workDir: string;

const runCheck = async (
  doc: Record<string, unknown>,
  accepted?: string[],
  extraArgs: string[] = []
): Promise<CommandResult> => {
  const oasPath = join(workDir, `oas_${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(oasPath, JSON.stringify(doc));
  const args = ['scripts/check_dashboard_terraform_mapping', '--oas', oasPath, ...extraArgs];
  const acceptedPath = `${oasPath}.accepted.json`;
  if (accepted) {
    writeFileSync(acceptedPath, JSON.stringify(accepted));
    args.push('--accepted', acceptedPath);
  }
  const readAccepted = () => (accepted ? readFileSync(acceptedPath, 'utf8') : undefined);
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, args, { cwd: REPO_ROOT });
    return { code: 0, output: stdout + stderr, acceptedAfter: readAccepted() };
  } catch (error) {
    const { code, stdout, stderr } = error as { code: number; stdout: string; stderr: string };
    return { code, output: stdout + stderr, acceptedAfter: readAccepted() };
  }
};

describe('node scripts/check_dashboard_terraform_mapping', () => {
  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'check-unmapped-unions-'));
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('passes on the published OpenAPI document with the checked-in list', async () => {
    const { code, output } = await runCheck(publishedOas);
    expect(output).not.toContain('ERROR');
    expect(code).toBe(0);
  });

  it('fails on a new union of objects that is neither mapped nor listed, naming what to add and where', async () => {
    const { code, output } = await runCheck(withHighlight(highlightUnion()));
    expect(code).toBe(1);
    expect(output).toContain(`"${HIGHLIGHT}"`);
    expect(output).toContain(ACCEPTED_LIST_PATH);
    expect(output).toContain('tfUnion(');
    expect(output).toContain('node scripts/capture_oas_snapshot');
    expect(output).toContain('node scripts/check_dashboard_terraform_mapping --update');
  });

  it('with --update, adds new unmapped unions and removes stale entries, keeping the list sorted', async () => {
    const stale = 'Kibana_HTTP_APIs_visNoLongerThere.config';
    const { code, acceptedAfter } = await runCheck(
      withHighlight(highlightUnion()),
      [stale, ...acceptedJsonLeaves],
      ['--update']
    );
    expect(code).toBe(0);
    const expected = [...acceptedJsonLeaves, HIGHLIGHT].sort();
    expect(acceptedAfter).toBe(`${JSON.stringify(expected, null, 2)}\n`);
  });

  it('with --update, leaves a list that is already correct untouched', async () => {
    const { code, acceptedAfter, output } = await runCheck(publishedOas, acceptedJsonLeaves, [
      '--update',
    ]);
    expect(code).toBe(0);
    expect(output).not.toContain('Updated');
    expect(acceptedAfter).toBe(JSON.stringify(acceptedJsonLeaves));
  });

  it('fails when merged branches each add a different unmapped union under the same name', async () => {
    const doc = withHighlight(highlightUnion());
    doc.components.schemas.Kibana_HTTP_APIs_visXyChartESQL.properties.highlight =
      highlightUnion('to');
    const { code, output } = await runCheck(doc);
    expect(code).toBe(1);
    expect(output).toContain(`"${HIGHLIGHT}"`);
  });

  it('passes once the new union is mapped', async () => {
    const { code } = await runCheck(
      withHighlight({ ...highlightUnion(), 'x-tf-union': { discriminator: 'kind' } })
    );
    expect(code).toBe(0);
  });

  it('passes once the new union is on the list of accepted JSON leaves', async () => {
    const { code } = await runCheck(withHighlight(highlightUnion()), [
      ...acceptedJsonLeaves,
      HIGHLIGHT,
    ]);
    expect(code).toBe(0);
  });

  it('fails on a listed union that is no longer unmapped, naming the entry to remove', async () => {
    const { code, output } = await runCheck(publishedOas, [...acceptedJsonLeaves, HIGHLIGHT]);
    expect(code).toBe(1);
    expect(output).toContain(`"${HIGHLIGHT}"`);
    expect(output).toContain('remove');
  });
});
