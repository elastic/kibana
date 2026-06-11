/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  computeDelta,
  findMissingPlaceholders,
  extractMessagesFromContent,
} from './es_translation_utils';

// ---------------------------------------------------------------------------
// computeDelta
// ---------------------------------------------------------------------------

describe('computeDelta', () => {
  const existing = {
    messages: {
      'discover.unchanged': 'Sin cambios',
      'discover.changed': 'Traducción antigua',
      'discover.removed': 'Esta clave desaparece',
    },
  };

  const fingerprints = {
    'discover.unchanged': 'Unchanged English',
    'discover.changed': 'Old English source',
    'discover.removed': 'Removed English',
  };

  const source = {
    'discover.unchanged': 'Unchanged English', // same as fingerprint → skip
    'discover.changed': 'New English source', // different from fingerprint → retranslate
    'discover.new': 'Brand new string', // not in existing → translate
    // 'discover.removed' is absent → will be removed
  };

  it('includes new keys in delta', () => {
    const { delta } = computeDelta(source, existing, fingerprints);
    expect(delta['discover.new']).toBe('Brand new string');
  });

  it('includes keys whose English source changed', () => {
    const { delta } = computeDelta(source, existing, fingerprints);
    expect(delta['discover.changed']).toBe('New English source');
  });

  it('excludes keys that are already translated and unchanged', () => {
    const { delta } = computeDelta(source, existing, fingerprints);
    expect(delta).not.toHaveProperty('discover.unchanged');
  });

  it('reports removed keys', () => {
    const { removed } = computeDelta(source, existing, fingerprints);
    expect(removed).toContain('discover.removed');
  });

  it('does not report unchanged or new keys as removed', () => {
    const { removed } = computeDelta(source, existing, fingerprints);
    expect(removed).not.toContain('discover.unchanged');
    expect(removed).not.toContain('discover.new');
  });

  it('returns empty delta and no removals when everything is up to date', () => {
    const upToDateSource = { 'discover.unchanged': 'Unchanged English' };
    const upToDateExisting = { messages: { 'discover.unchanged': 'Sin cambios' } };
    const upToDateFingerprints = { 'discover.unchanged': 'Unchanged English' };

    const { delta, removed } = computeDelta(upToDateSource, upToDateExisting, upToDateFingerprints);
    expect(Object.keys(delta)).toHaveLength(0);
    expect(removed).toHaveLength(0);
  });

  it('treats all keys as new when es.json does not exist yet', () => {
    const { delta } = computeDelta(source, { messages: {} }, {});
    expect(Object.keys(delta)).toEqual(expect.arrayContaining(Object.keys(source)));
  });
});

// ---------------------------------------------------------------------------
// findMissingPlaceholders
// ---------------------------------------------------------------------------

describe('findMissingPlaceholders', () => {
  it('returns empty array when all placeholders are preserved', () => {
    const missing = findMissingPlaceholders('Hello {name}', 'Hola {name}');
    expect(missing).toHaveLength(0);
  });

  it('detects a missing simple placeholder', () => {
    const missing = findMissingPlaceholders('Hello {name}', 'Hola');
    expect(missing).toContain('name');
  });

  it('detects missing placeholder among multiple', () => {
    const missing = findMissingPlaceholders(
      'Found {count} results in {index}',
      'Se encontraron {count} resultados'
    );
    expect(missing).toContain('index');
    expect(missing).not.toContain('count');
  });

  it('handles ICU plural syntax', () => {
    const source = '{count, plural, one {# item} other {# items}}';
    const translation = '{count, plural, one {# elemento} other {# elementos}}';
    const missing = findMissingPlaceholders(source, translation);
    expect(missing).toHaveLength(0);
  });

  it('detects dropped ICU plural placeholder', () => {
    const source = '{count, plural, one {# item} other {# items}}';
    const translation = 'muchos elementos'; // placeholder completely dropped
    const missing = findMissingPlaceholders(source, translation);
    expect(missing).toContain('count');
  });

  it('returns empty for strings with no placeholders', () => {
    const missing = findMissingPlaceholders('No results found', 'No se encontraron resultados');
    expect(missing).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// extractMessagesFromContent
// ---------------------------------------------------------------------------

describe('extractMessagesFromContent', () => {
  it('extracts a single-quoted defaultMessage', () => {
    const content = `
      i18n.translate('discover.noResults.title', {
        defaultMessage: 'No results found',
      })
    `;
    const result = extractMessagesFromContent(content);
    expect(result['discover.noResults.title']).toBe('No results found');
  });

  it('extracts a double-quoted defaultMessage', () => {
    const content = `
      i18n.translate("discover.searchBar.placeholder", {
        defaultMessage: "Search...",
      })
    `;
    const result = extractMessagesFromContent(content);
    expect(result['discover.searchBar.placeholder']).toBe('Search...');
  });

  it('extracts a string containing ICU placeholders', () => {
    const content = `
      i18n.translate('discover.resultsCount', {
        defaultMessage: 'Found {count} results in {index}',
        values: { count, index },
      })
    `;
    const result = extractMessagesFromContent(content);
    expect(result['discover.resultsCount']).toBe('Found {count} results in {index}');
  });

  it('extracts multiple strings from the same file', () => {
    const content = `
      i18n.translate('discover.key.one', { defaultMessage: 'First string' })
      i18n.translate('discover.key.two', { defaultMessage: 'Second string' })
    `;
    const result = extractMessagesFromContent(content);
    expect(result['discover.key.one']).toBe('First string');
    expect(result['discover.key.two']).toBe('Second string');
  });

  it('handles escaped quotes in defaultMessage', () => {
    const content = `i18n.translate('discover.key', { defaultMessage: 'it\\'s working' })`;
    const result = extractMessagesFromContent(content);
    expect(result['discover.key']).toBe("it's working");
  });

  it('returns empty object for content with no i18n calls', () => {
    const content = `const x = 'hello'; function foo() { return 42; }`;
    const result = extractMessagesFromContent(content);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('does not duplicate keys seen more than once', () => {
    const content = `
      i18n.translate('discover.key', { defaultMessage: 'First' })
      i18n.translate('discover.key', { defaultMessage: 'First' })
    `;
    const result = extractMessagesFromContent(content);
    expect(Object.keys(result).filter((k) => k === 'discover.key')).toHaveLength(1);
  });
});
