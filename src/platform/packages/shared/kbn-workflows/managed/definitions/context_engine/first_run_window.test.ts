/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

interface Step {
  name: string;
  type: string;
  with?: Record<string, unknown>;
}

const readDefinition = (file: string) =>
  parse(readFileSync(join(__dirname, file), 'utf8')) as {
    triggers: Array<{ type: string; inputs?: { properties: Record<string, unknown> } }>;
    steps: Step[];
  };

describe.each([
  ['dreaming.yaml'],
  ['dreaming_traces.yaml'],
  ['relationships.yaml'],
  ['maintenance.yaml'],
])('%s first run window', (file) => {
  const definition = readDefinition(file);

  it('starts 7 days back on a first run, and never reads further back than 30 days on its own', () => {
    const lastRun = definition.steps.find((step) => step.type === 'workflow.getLastRun');

    expect(lastRun?.with).toEqual({ default_hours: 168, max_hours: 720 });
  });

  it('takes an optional since on demand, as the one-off catch-up of an older backlog', () => {
    const manual = definition.triggers.find((trigger) => trigger.type === 'manual');

    expect(manual?.inputs?.properties.since).toEqual(
      expect.objectContaining({ type: 'string', description: expect.stringContaining('ISO 8601') })
    );
  });

  it('does not clamp since, so it can reach back past the 30 day limit', () => {
    const text = JSON.stringify(definition.steps);

    expect(text).toContain('inputs.since');
    expect(text).not.toMatch(/inputs\.since[^"]*max_hours/);
  });
});
