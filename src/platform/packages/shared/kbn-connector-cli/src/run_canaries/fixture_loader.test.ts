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
import path from 'path';
import { loadFixtures } from './fixture_loader';

describe('loadFixtures', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canary-fixtures-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const write = (name: string, content: string) => fs.writeFileSync(path.join(dir, name), content);

  it('loads a valid fixture and defaults input to an empty object', () => {
    write(
      'github.yaml',
      [
        'spec_id: .github',
        'cases:',
        '  - action: getMe',
        '    expect:',
        '      - path: login',
        '        type: string',
      ].join('\n')
    );

    expect(loadFixtures(dir)).toEqual([
      {
        spec_id: '.github',
        cases: [{ action: 'getMe', input: {}, expect: [{ path: 'login', type: 'string' }] }],
      },
    ]);
  });

  it('keeps name and enabled when set', () => {
    write(
      'jira.yaml',
      [
        'spec_id: .jira-cloud',
        'cases:',
        '  - action: getProjects',
        '    name: first project',
        '    enabled: false',
        '    input: { maxResults: 1 }',
        '    expect:',
        '      - path: values',
        '        type: array',
      ].join('\n')
    );

    const [fixture] = loadFixtures(dir);
    expect(fixture.cases[0]).toMatchObject({
      name: 'first project',
      enabled: false,
      input: { maxResults: 1 },
    });
  });

  it('rejects two fixture files for the same spec_id', () => {
    const content =
      'spec_id: .github\ncases:\n  - action: a\n    expect: [{path: a, type: string}]';
    write('github.yaml', content);
    write('github_more.yaml', content);
    expect(() => loadFixtures(dir)).toThrow(/spec_id \.github is already used by github\.yaml/);
  });

  it.each(['items.', 'items..name', '.items'])(
    'rejects the path "%s" with an empty segment',
    (p) => {
      write(
        'bad.yaml',
        `spec_id: .x\ncases:\n  - action: a\n    expect: [{path: "${p}", type: string}]`
      );
      expect(() => loadFixtures(dir)).toThrow(/has an empty segment/);
    }
  );

  it('accepts the $ root path', () => {
    write('ok.yaml', 'spec_id: .x\ncases:\n  - action: a\n    expect: [{path: $, type: object}]');
    expect(loadFixtures(dir)).toHaveLength(1);
  });

  it('rejects a .yml fixture instead of silently skipping it', () => {
    write('slack.yml', 'spec_id: .slack\ncases: []');
    expect(() => loadFixtures(dir)).toThrow(/slack\.yml: fixture files must use the \.yaml/);
  });

  it('ignores non-yaml files', () => {
    write('README.md', '# not a fixture');
    expect(loadFixtures(dir)).toEqual([]);
  });

  it.each([
    ['missing spec_id', 'cases: []', /missing spec_id/],
    ['empty cases', 'spec_id: .x\ncases: []', /non-empty list/],
    [
      'missing action',
      'spec_id: .x\ncases:\n  - expect: [{path: a, type: string}]',
      /missing action/,
    ],
    [
      'empty expect',
      'spec_id: .x\ncases:\n  - action: a\n    expect: []',
      /"expect" must be a non-empty list/,
    ],
    [
      'invalid type',
      'spec_id: .x\ncases:\n  - action: a\n    expect: [{path: a, type: integer}]',
      /invalid type "integer"/,
    ],
    [
      'non-mapping input',
      'spec_id: .x\ncases:\n  - action: a\n    input: [1]\n    expect: [{path: a, type: string}]',
      /"input" must be a mapping/,
    ],
  ])('rejects a fixture with %s', (_label, content, message) => {
    write('bad.yaml', content);
    expect(() => loadFixtures(dir)).toThrow(message);
  });
});
