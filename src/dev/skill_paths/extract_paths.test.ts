/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { classifyToken } from './extract_paths';

describe('classifyToken', () => {
  describe('skip cases', () => {
    it('skips placeholder with angle-bracket namespace', () => {
      const result = classifyToken(
        'test/scout/<namespace>/ui/',
        'backtick',
        '`test/scout/<namespace>/ui/`',
        ''
      );
      expect(result.kind).toBe('skip');
    });

    it('skips glob with double-star', () => {
      const result = classifyToken('public/**/*.test.ts', 'backtick', '`public/**/*.test.ts`', '');
      expect(result.kind).toBe('skip');
    });

    it('skips module specifier starting with @', () => {
      const result = classifyToken('@kbn/scout-security', 'backtick', '`@kbn/scout-security`', '');
      expect(result.kind).toBe('skip');
    });

    it('skips absolute/route path starting with /', () => {
      const result = classifyToken(
        '/api/security/entity_store/',
        'backtick',
        '`/api/security/entity_store/`',
        ''
      );
      expect(result.kind).toBe('skip');
    });

    it('skips filename-only token with no slash', () => {
      const result = classifyToken(
        'alerts_table.test.ts',
        'backtick',
        '`alerts_table.test.ts`',
        ''
      );
      expect(result.kind).toBe('skip');
    });

    it('skips HTTPS URL', () => {
      const result = classifyToken(
        'https://example.com/foo',
        'backtick',
        '`https://example.com/foo`',
        ''
      );
      expect(result.kind).toBe('skip');
    });

    it('skips token containing shell variable $', () => {
      const result = classifyToken('$REPO_ROOT/scripts', 'backtick', '`$REPO_ROOT/scripts`', '');
      expect(result.kind).toBe('skip');
    });

    it('skips token containing ellipsis ...', () => {
      const result = classifyToken('test/scout/.../ui/', 'backtick', '`test/scout/.../ui/`', '');
      expect(result.kind).toBe('skip');
    });

    it('honors the skill-path-ignore inline marker', () => {
      const result = classifyToken(
        'scripts/nonexistent.js',
        'backtick',
        '`scripts/nonexistent.js` <!-- skill-path-ignore -->',
        ''
      );
      expect(result.kind).toBe('skip');
    });

    it('skips backtick token with slash but no recognised anchor (no-anchor)', () => {
      const result = classifyToken(
        'plugins/security_solution/public/',
        'backtick',
        '`plugins/security_solution/public/`',
        '' // file content has NO skill-path-base comment
      );
      expect(result.kind).toBe('skip');
      expect((result as { kind: 'skip'; reason: string }).reason).toBe('no-anchor');
    });
  });

  describe('validate cases', () => {
    it('validates a repo-root prefixed path (scripts/)', () => {
      const result = classifyToken('scripts/scout.js', 'backtick', '`scripts/scout.js`', '');
      expect(result.kind).toBe('validate');
      if (result.kind === 'validate') {
        expect(result.anchor).toBe('repo-root');
        expect(result.token).toBe('scripts/scout.js');
      }
    });

    it('validates a repo-root prefixed path (x-pack/)', () => {
      const result = classifyToken(
        'x-pack/solutions/security/',
        'backtick',
        '`x-pack/solutions/security/`',
        ''
      );
      expect(result.kind).toBe('validate');
      if (result.kind === 'validate') {
        expect(result.anchor).toBe('repo-root');
      }
    });

    it('validates a markdown link with anchor=file', () => {
      const result = classifyToken(
        'references/mode-generate.md',
        'markdown-link',
        '[foo](references/mode-generate.md)',
        ''
      );
      expect(result.kind).toBe('validate');
      if (result.kind === 'validate') {
        expect(result.anchor).toBe('file');
        expect(result.token).toBe('references/mode-generate.md');
      }
    });

    it('validates a markdown link with fragment — strips fragment from token', () => {
      const result = classifyToken(
        '../SKILL.md#section',
        'markdown-link',
        '[foo](../SKILL.md#section)',
        ''
      );
      expect(result.kind).toBe('validate');
      if (result.kind === 'validate') {
        expect(result.anchor).toBe('file');
        expect(result.token).toBe('../SKILL.md');
      }
    });

    it('validates a declared-base path when file has skill-path-base comment', () => {
      const fileContent = '<!-- skill-path-base: x-pack/solutions/security -->\nsome content';
      const result = classifyToken(
        'plugins/security_solution/public/',
        'backtick',
        '`plugins/security_solution/public/`',
        fileContent
      );
      expect(result.kind).toBe('validate');
      if (result.kind === 'validate') {
        expect(result.anchor).toBe('declared-base');
        expect(result.token).toBe('plugins/security_solution/public/');
        expect(result.declaredBase).toBe('x-pack/solutions/security');
      }
    });
  });
});
