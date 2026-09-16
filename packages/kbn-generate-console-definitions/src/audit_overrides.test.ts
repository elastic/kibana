/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import Path from 'path';
import type { EndpointDescription } from '@kbn/console-plugin/common/types';
import {
  compareOverrideAuditStates,
  createOverrideAuditState,
  hasOverrideAuditChanges,
  OVERRIDE_AUDIT_BASELINE_FILE,
  readOverrideAuditState,
} from './audit_overrides';
import {
  CONSOLE_DEFINITIONS_FOLDER,
  GENERATED_SUBFOLDER,
  OVERRIDES_SUBFOLDER,
} from './console_definition_paths';

const writeDefinition = ({
  folder,
  endpoint,
  description,
}: {
  folder: string;
  endpoint: string;
  description: EndpointDescription;
}) => {
  fs.writeFileSync(
    Path.resolve(folder, `${endpoint}.json`),
    `${JSON.stringify({ [endpoint]: description }, null, 2)}\n`
  );
};

describe('override conflict audit', () => {
  let root: string;
  let generatedFolder: string;
  let overridesFolder: string;

  beforeEach(() => {
    root = fs.mkdtempSync(Path.join(os.tmpdir(), 'console-override-audit-'));
    generatedFolder = Path.resolve(root, 'generated');
    overridesFolder = Path.resolve(root, 'overrides');
    fs.mkdirSync(generatedFolder);
    fs.mkdirSync(overridesFolder);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('WHEN the conflict state is unchanged SHOULD report no audit changes', () => {
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: {
        data_autocomplete_rules: { query: { __scope_link: 'GLOBAL.query' } },
      },
    });
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { query: {} } },
    });
    const baseline = createOverrideAuditState({ generatedFolder, overridesFolder });

    expect(
      hasOverrideAuditChanges(
        compareOverrideAuditStates(
          baseline,
          createOverrideAuditState({ generatedFolder, overridesFolder })
        )
      )
    ).toBe(false);
  });

  it('WHEN generated content changes under an override SHOULD report a changed conflict', () => {
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { settings: { existing: '' } } },
    });
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { settings: {} } },
    });
    const baseline = createOverrideAuditState({ generatedFolder, overridesFolder });
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: {
        data_autocomplete_rules: { settings: { existing: '', newly_generated: '' } },
      },
    });

    expect(
      compareOverrideAuditStates(
        baseline,
        createOverrideAuditState({ generatedFolder, overridesFolder })
      ).changedConflicts
    ).toEqual(['endpoint::settings']);
  });

  // The audit tracks drift in the generated values that overrides replace, so it
  // can flag stale overrides when a specification sync changes generated body rules.
  // Changes made only to the curated override (with the generated value unchanged)
  // are intentionally out of scope: the fingerprint keys on the generated value.
  it('WHEN only curated content changes SHOULD report no audit changes', () => {
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { settings: { generated: '' } } },
    });
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { settings: { first_override: '' } } },
    });
    const baseline = createOverrideAuditState({ generatedFolder, overridesFolder });
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { settings: { second_override: '' } } },
    });

    expect(
      hasOverrideAuditChanges(
        compareOverrideAuditStates(
          baseline,
          createOverrideAuditState({ generatedFolder, overridesFolder })
        )
      )
    ).toBe(false);
  });

  it('WHEN an identical override becomes stale SHOULD report a new conflict', () => {
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { enabled: true } },
    });
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { enabled: true } },
    });
    const baseline = createOverrideAuditState({ generatedFolder, overridesFolder });
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { enabled: { __one_of: [true, false] } } },
    });

    expect(
      compareOverrideAuditStates(
        baseline,
        createOverrideAuditState({ generatedFolder, overridesFolder })
      ).addedConflicts
    ).toEqual(['endpoint::enabled']);
  });

  it('WHEN an override-only key becomes generated SHOULD report a new conflict', () => {
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { generated_only: '' } },
    });
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { future_key: {} } },
    });
    const baseline = createOverrideAuditState({ generatedFolder, overridesFolder });
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { generated_only: '', future_key: { nested: '' } } },
    });

    expect(
      compareOverrideAuditStates(
        baseline,
        createOverrideAuditState({ generatedFolder, overridesFolder })
      ).addedConflicts
    ).toEqual(['endpoint::future_key']);
  });

  it('WHEN object keys are reordered SHOULD keep the same conflict fingerprint', () => {
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { settings: { first: '', second: '' } } },
    });
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { settings: {} } },
    });
    const baseline = createOverrideAuditState({ generatedFolder, overridesFolder });
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { settings: { second: '', first: '' } } },
    });

    expect(
      hasOverrideAuditChanges(
        compareOverrideAuditStates(
          baseline,
          createOverrideAuditState({ generatedFolder, overridesFolder })
        )
      )
    ).toBe(false);
  });

  it('WHEN array values are reordered SHOULD report a changed conflict', () => {
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { values: { __one_of: ['first', 'second'] } } },
    });
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { values: [] } },
    });
    const baseline = createOverrideAuditState({ generatedFolder, overridesFolder });
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { values: { __one_of: ['second', 'first'] } } },
    });

    expect(
      compareOverrideAuditStates(
        baseline,
        createOverrideAuditState({ generatedFolder, overridesFolder })
      ).changedConflicts
    ).toEqual(['endpoint::values']);
  });

  it('WHEN an approved conflict is resolved SHOULD report a removed conflict', () => {
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { enabled: { __one_of: [true, false] } } },
    });
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { enabled: true } },
    });
    const baseline = createOverrideAuditState({ generatedFolder, overridesFolder });
    fs.unlinkSync(Path.resolve(overridesFolder, 'endpoint.json'));

    expect(
      compareOverrideAuditStates(
        baseline,
        createOverrideAuditState({ generatedFolder, overridesFolder })
      ).removedConflicts
    ).toEqual(['endpoint::enabled']);
  });

  it.each([
    ['__scope_link', { __scope_link: 'other.endpoint' }],
    ['__one_of', { __one_of: [{ first: '' }, { second: '' }] }],
    ['__any_of', { __any_of: ['first', 'second'] }],
  ])('WHEN top-level %s replaces generated rules SHOULD fingerprint the whole body', (_, rules) => {
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { generated: '' } },
    });
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: rules },
    });

    expect(
      Object.keys(createOverrideAuditState({ generatedFolder, overridesFolder }).conflicts)
    ).toEqual(['endpoint::<body>']);
  });

  it.each([
    ['__scope_link', { __scope_link: 'GLOBAL.query' }],
    ['__one_of', { __one_of: [{ generated: '' }, { other: '' }] }],
    ['__any_of', { __any_of: ['first', 'second'] }],
  ])('WHEN generated top-level %s is replaced SHOULD fingerprint the whole body', (_, rules) => {
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: rules },
    });
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'endpoint',
      description: { data_autocomplete_rules: { curated: '' } },
    });

    expect(
      Object.keys(createOverrideAuditState({ generatedFolder, overridesFolder }).conflicts)
    ).toEqual(['endpoint::<body>']);
  });

  it('WHEN an override has no generated counterpart SHOULD report an orphan', () => {
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'orphan',
      description: { data_autocomplete_rules: { value: '' } },
    });

    expect(createOverrideAuditState({ generatedFolder, overridesFolder }).orphanOverrides).toEqual([
      'orphan.json',
    ]);
  });

  it('WHEN generated and override endpoint names differ SHOULD reject the file pair', () => {
    writeDefinition({
      folder: generatedFolder,
      endpoint: 'generated_name',
      description: { data_autocomplete_rules: { value: '' } },
    });
    fs.renameSync(
      Path.resolve(generatedFolder, 'generated_name.json'),
      Path.resolve(generatedFolder, 'override_name.json')
    );
    writeDefinition({
      folder: overridesFolder,
      endpoint: 'override_name',
      description: { data_autocomplete_rules: { value: '' } },
    });

    expect(() => createOverrideAuditState({ generatedFolder, overridesFolder })).toThrow(
      'Endpoint mismatch in override_name.json'
    );
  });

  it('WHEN auditing committed definitions SHOULD match the approved baseline', () => {
    const actual = createOverrideAuditState({
      generatedFolder: Path.resolve(CONSOLE_DEFINITIONS_FOLDER, GENERATED_SUBFOLDER),
      overridesFolder: Path.resolve(CONSOLE_DEFINITIONS_FOLDER, OVERRIDES_SUBFOLDER),
    });
    const baseline = readOverrideAuditState(OVERRIDE_AUDIT_BASELINE_FILE);

    expect(compareOverrideAuditStates(baseline, actual)).toEqual({
      addedConflicts: [],
      changedConflicts: [],
      removedConflicts: [],
      addedOrphans: [],
      removedOrphans: [],
    });
  });
});
