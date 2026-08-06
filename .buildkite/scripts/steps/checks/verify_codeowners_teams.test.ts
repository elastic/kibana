/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/code-owners', () => ({
  getTeams: jest.fn(),
  getCodeOwnersEntries: jest.fn(),
}));

import type { CodeOwnersEntry, Team } from '@kbn/code-owners';
import { getCodeOwnersEntries, getTeams } from '@kbn/code-owners';
import {
  findConnectorSpecsOwnershipIssues,
  findUnrecognizedTeams,
  getCodeownersTeams,
  getRegistryGithubTeams,
} from './verify_codeowners_teams';

const mockGetTeams = jest.mocked(getTeams);
const mockGetCodeOwnersEntries = jest.mocked(getCodeOwnersEntries);

const team = (id: string, githubTeam?: string): Team =>
  ({ id, name: id, github: { team: githubTeam } } as Team);

const entry = (teams: string[], pattern = '*'): CodeOwnersEntry =>
  ({ pattern, teams } as CodeOwnersEntry);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getRegistryGithubTeams', () => {
  it('collects the github team handle of every registry entry', () => {
    mockGetTeams.mockReturnValue([
      team('core', 'elastic/kibana-core'),
      team('ops', 'elastic/kibana-operations'),
    ]);

    expect(getRegistryGithubTeams()).toEqual(
      new Set(['elastic/kibana-core', 'elastic/kibana-operations'])
    );
  });

  it('skips entries that have no github team handle', () => {
    mockGetTeams.mockReturnValue([
      team('core', 'elastic/kibana-core'),
      team('label-only', undefined),
    ]);

    expect(getRegistryGithubTeams()).toEqual(new Set(['elastic/kibana-core']));
  });
});

describe('getCodeownersTeams', () => {
  it('keeps only elastic/ team handles and drops individual users', () => {
    mockGetCodeOwnersEntries.mockReturnValue([
      entry(['elastic/kibana-core', 'someuser']),
      entry(['elastic/kibana-operations']),
    ]);

    expect(getCodeownersTeams()).toEqual(
      new Set(['elastic/kibana-core', 'elastic/kibana-operations'])
    );
  });

  it('excludes the kibanamachine backport bot', () => {
    mockGetCodeOwnersEntries.mockReturnValue([
      entry(['elastic/kibana-core', 'elastic/kibanamachine']),
    ]);

    expect(getCodeownersTeams()).toEqual(new Set(['elastic/kibana-core']));
  });
});

describe('findUnrecognizedTeams', () => {
  it('returns an empty list when every CODEOWNERS team is tracked', () => {
    const registry = new Set(['elastic/kibana-core', 'elastic/kibana-operations']);
    const codeowners = new Set(['elastic/kibana-core']);

    expect(findUnrecognizedTeams(codeowners, registry)).toEqual([]);
  });

  it('returns the sorted teams missing from the registry', () => {
    const registry = new Set(['elastic/kibana-core']);
    const codeowners = new Set(['elastic/zeta-team', 'elastic/kibana-core', 'elastic/alpha-team']);

    expect(findUnrecognizedTeams(codeowners, registry)).toEqual([
      'elastic/alpha-team',
      'elastic/zeta-team',
    ]);
  });
});

describe('findConnectorSpecsOwnershipIssues', () => {
  it('accepts connector directories with explicit Elastic team owners', () => {
    const rootEntries = [
      { name: 'github', isDirectory: true },
      { name: 'atlassian', isDirectory: true },
    ];
    const codeownersEntries = [
      entry(
        ['elastic/workchat-eng'],
        'src/platform/packages/shared/kbn-connector-specs/src/specs/github/**'
      ),
      entry(
        ['elastic/workchat-eng'],
        'src/platform/packages/shared/kbn-connector-specs/src/specs/atlassian/**'
      ),
    ];

    expect(findConnectorSpecsOwnershipIssues(rootEntries, codeownersEntries)).toEqual([]);
  });

  it('reports missing owners, non-Elastic owners, and files at the specs root', () => {
    const rootEntries = [
      { name: 'github', isDirectory: true },
      { name: 'unowned_connector', isDirectory: true },
      { name: 'unexpected.ts', isDirectory: false },
    ];
    const codeownersEntries = [
      entry(['someuser'], 'src/platform/packages/shared/kbn-connector-specs/src/specs/github/**'),
    ];

    expect(findConnectorSpecsOwnershipIssues(rootEntries, codeownersEntries)).toEqual([
      'src/platform/packages/shared/kbn-connector-specs/src/specs/github/** must explicitly assign an @elastic team',
      'src/platform/packages/shared/kbn-connector-specs/src/specs/unexpected.ts must be inside a connector directory, not at the specs root',
      'src/platform/packages/shared/kbn-connector-specs/src/specs/unowned_connector/** must explicitly assign an @elastic team',
    ]);
  });

  it('does not accept a broad specs owner in place of an exact connector entry', () => {
    const rootEntries = [{ name: 'github', isDirectory: true }];
    const codeownersEntries = [
      entry(
        ['elastic/workchat-eng'],
        'src/platform/packages/shared/kbn-connector-specs/src/specs/**'
      ),
    ];

    expect(findConnectorSpecsOwnershipIssues(rootEntries, codeownersEntries)).toEqual([
      'src/platform/packages/shared/kbn-connector-specs/src/specs/github/** must explicitly assign an @elastic team',
    ]);
  });

  it('uses the first matching entry from the reversed CODEOWNERS list', () => {
    const rootEntries = [{ name: 'github', isDirectory: true }];
    const pattern = 'src/platform/packages/shared/kbn-connector-specs/src/specs/github/**';
    mockGetCodeOwnersEntries.mockReturnValue([
      entry(['someuser'], pattern),
      entry(['elastic/workchat-eng'], pattern),
    ]);

    expect(findConnectorSpecsOwnershipIssues(rootEntries, mockGetCodeOwnersEntries())).toEqual([
      'src/platform/packages/shared/kbn-connector-specs/src/specs/github/** must explicitly assign an @elastic team',
    ]);
  });
});
