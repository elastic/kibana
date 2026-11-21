/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toSkillDirs } from './skill_dirs.ts';

describe('toSkillDirs', () => {
  it('returns the directory of every tracked SKILL.md', () => {
    expect(
      toSkillDirs([
        'plugin/a/server/skills/one/SKILL.md',
        'plugin/a/server/skills/one/reference.md',
        'plugin/a/server/skills/two/SKILL.md',
      ])
    ).toEqual(['plugin/a/server/skills/one', 'plugin/a/server/skills/two']);
  });

  it('ignores files that are not named exactly SKILL.md', () => {
    expect(
      toSkillDirs(['plugin/a/NOT_SKILL.md', 'plugin/a/skill.md', 'plugin/a/SKILL.md.text'])
    ).toEqual([]);
  });

  it('ignores skills inside dot-prefixed directories, which are developer tooling', () => {
    expect(
      toSkillDirs([
        '.agents/skills/x/SKILL.md',
        'plugin/a/.claude/skills/y/SKILL.md',
        'plugin/a/server/skills/ok/SKILL.md',
      ])
    ).toEqual(['plugin/a/server/skills/ok']);
  });

  it('handles a SKILL.md at the repository root', () => {
    expect(toSkillDirs(['SKILL.md'])).toEqual(['.']);
  });
});
