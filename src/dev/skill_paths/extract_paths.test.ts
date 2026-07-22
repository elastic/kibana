/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { classifyToken, extractPaths } from './extract_paths';

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

describe('extractPaths', () => {
  it('extracts backtick inline path from plain prose', () => {
    const results = extractPaths('See `scripts/scout.js` for details.');
    expect(results).toHaveLength(1);
    expect(results[0].token).toBe('scripts/scout.js');
    expect(results[0].line).toBe(1);
    expect(results[0].tokenKind).toBe('backtick');
  });

  it('skips paths inside fenced code blocks', () => {
    const content = [
      'Some prose.',
      '```bash',
      'x-pack/solutions/security/something.ts',
      '```',
      'After fence.',
    ].join('\n');
    const results = extractPaths(content);
    const fenceTokens = results.filter((r) => r.token.includes('security/something.ts'));
    expect(fenceTokens).toHaveLength(0);
  });

  it('extracts markdown link target; classifyToken strips fragment and assigns anchor=file', () => {
    const results = extractPaths('[link](references/mode-generate.md#section-name)');
    expect(results).toHaveLength(1);
    expect(results[0].tokenKind).toBe('markdown-link');
    // raw token retains the fragment — classifyToken strips it
    const classified = classifyToken(
      results[0].token,
      results[0].tokenKind,
      results[0].rawLine,
      ''
    );
    expect(classified.kind).toBe('validate');
    if (classified.kind === 'validate') {
      expect(classified.token).toBe('references/mode-generate.md');
      expect(classified.anchor).toBe('file');
    }
  });

  it('respects declared-base comment: classifyToken assigns anchor=declared-base', () => {
    const content =
      '<!-- skill-path-base: x-pack/solutions/security -->\n\nSee `plugins/security_solution/` for details.';
    const results = extractPaths(content);
    const token = results.find((r) => r.token === 'plugins/security_solution/');
    expect(token).toBeDefined();
    if (token) {
      const classified = classifyToken(token.token, token.tokenKind, token.rawLine, content);
      expect(classified.kind).toBe('validate');
      if (classified.kind === 'validate') {
        expect(classified.anchor).toBe('declared-base');
      }
    }
  });

  it('returns line numbers correctly — path on line 2 reports line=2', () => {
    const content = 'No path here.\nSee `scripts/scout.js` here.';
    const results = extractPaths(content);
    expect(results).toHaveLength(1);
    expect(results[0].line).toBe(2);
  });
});
