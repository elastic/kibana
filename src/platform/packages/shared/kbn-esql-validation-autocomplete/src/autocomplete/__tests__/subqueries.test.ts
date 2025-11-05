/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('Subquery autocomplete', () => {
  describe('basic suggestions', () => {
    test('suggests indices inside subquery', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a, (FROM /)');
      const texts = suggestions.map((s) => s.text);

      expect(texts).toContain('a');
      expect(texts).toContain('index');
      expect(texts).toContain('otherIndex');
    });

    test('does not suggest nested subqueries', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a, (FROM /)');
      const subquerySuggestion = suggestions.find((s) => s.text === '(FROM $0)');

      expect(subquerySuggestion).toBeUndefined();
    });

    test('suggests pipe and comma after index', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a, (FROM index /)');
      const texts = suggestions.map((s) => s.text);

      expect(texts).toContain(',');
      expect(texts).toContain('| ');
      expect(texts).toContain('METADATA ');
    });

    test('filters out already used indices', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a, (FROM index, /)');
      const indexSuggestion = suggestions.find((s) => s.text === 'index');

      expect(indexSuggestion).toBeUndefined();
    });
  });

  describe('metadata', () => {
    test('suggests METADATA keyword', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a, (FROM index MET/)');
      const texts = suggestions.map((s) => s.text);

      expect(texts).toContain('METADATA ');
    });

    test('suggests metadata fields after METADATA keyword with space', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a, (FROM index METADATA /)');
      const texts = suggestions.map((s) => s.text);

      // Should suggest metadata fields, not subquery
      expect(texts).toContain('_id');
      expect(texts).toContain('_version');
      expect(texts).toContain('_index');
      expect(texts).toContain('_source');
      expect(texts).toContain('_ignored');
      expect(texts).not.toContain('(FROM $0)');
    });

    test('suggests pipe after metadata field', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a, (FROM index METADATA _id /)');
      const texts = suggestions.map((s) => s.text);

      expect(texts).toContain(',');
      expect(texts).toContain('| ');
    });
  });

  describe('field context resolution', () => {
    test('suggests fields inside subquery', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a, (FROM index | WHERE /)');
      const texts = suggestions.map((s) => s.text);

      expect(texts.some((s) => s.startsWith('booleanField'))).toBe(true);
    });

    test('suggests fields after subquery closes', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a, (FROM index) | WHERE /');
      const texts = suggestions.map((s) => s.text);

      expect(texts.some((s) => s.startsWith('booleanField'))).toBe(true);
    });
  });

  describe('command restrictions', () => {
    test('does not suggest FORK inside subquery', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a, (FROM index | /)');
      const forkSuggestion = suggestions.find((s) => s.text === 'FORK ');

      expect(forkSuggestion).toBeUndefined();
    });

    test('does not suggest INLINESTATS outside subquery', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a | /');
      const inlinestatsSuggestion = suggestions.find((s) => s.text === 'INLINESTATS ');

      expect(inlinestatsSuggestion).toBeUndefined();
    });
  });

  describe('nesting restrictions', () => {
    test('does not suggest subquery at second level', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM a, (FROM b, (FROM /))');
      const subquerySuggestion = suggestions.find((s) => s.text === '(FROM $0)');

      expect(subquerySuggestion).toBeUndefined();
    });

    test('allows subquery at root level', async () => {
      const { suggest } = await setup();

      const suggestions = await suggest('FROM (FROM a), /');
      const subquerySuggestion = suggestions.find((s) => s.text === '(FROM $0)');

      expect(subquerySuggestion).toBeDefined();
    });
  });
});
