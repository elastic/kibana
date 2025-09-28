/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { createLiquidFilterCompletions, createLiquidSyntaxCompletions, LIQUID_FILTERS } from './liquid_completions';

describe('liquid_completions', () => {
  const mockRange: monaco.IRange = {
    startLineNumber: 1,
    endLineNumber: 1,
    startColumn: 10,
    endColumn: 15,
  };

  describe('LIQUID_FILTERS', () => {
    it('should contain expected common filters', () => {
      const filterNames = LIQUID_FILTERS.map(f => f.name);
      
      // Test some key filters are present
      expect(filterNames).toContain('upcase');
      expect(filterNames).toContain('downcase');
      expect(filterNames).toContain('capitalize');
      expect(filterNames).toContain('json');
      expect(filterNames).toContain('size');
      expect(filterNames).toContain('first');
      expect(filterNames).toContain('last');
      expect(filterNames).toContain('join');
      expect(filterNames).toContain('plus');
      expect(filterNames).toContain('minus');
      expect(filterNames).toContain('default');
    });

    it('should have proper structure for each filter', () => {
      LIQUID_FILTERS.forEach(filter => {
        expect(filter).toHaveProperty('name');
        expect(filter).toHaveProperty('description');
        expect(filter).toHaveProperty('insertText');
        expect(filter).toHaveProperty('example');
        
        expect(typeof filter.name).toBe('string');
        expect(typeof filter.description).toBe('string');
        expect(typeof filter.insertText).toBe('string');
        expect(typeof filter.example).toBe('string');
        
        expect(filter.name.length).toBeGreaterThan(0);
        expect(filter.description.length).toBeGreaterThan(0);
        expect(filter.insertText.length).toBeGreaterThan(0);
      });
    });
  });

  describe('createLiquidFilterCompletions', () => {
    it('should return all filters when no prefix provided', () => {
      const completions = createLiquidFilterCompletions(mockRange);
      
      expect(completions).toHaveLength(LIQUID_FILTERS.length);
      expect(completions[0]).toHaveProperty('label');
      expect(completions[0]).toHaveProperty('kind', monaco.languages.CompletionItemKind.Function);
      expect(completions[0]).toHaveProperty('detail');
      expect(completions[0]).toHaveProperty('documentation');
      expect(completions[0]).toHaveProperty('insertText');
      expect(completions[0]).toHaveProperty('range', mockRange);
    });

    it('should return all filters when empty prefix provided', () => {
      const completions = createLiquidFilterCompletions(mockRange, '');
      
      expect(completions).toHaveLength(LIQUID_FILTERS.length);
    });

    it('should filter completions based on prefix', () => {
      const completions = createLiquidFilterCompletions(mockRange, 'up');
      
      expect(completions.length).toBeGreaterThan(0);
      expect(completions.length).toBeLessThan(LIQUID_FILTERS.length);
      
      completions.forEach(completion => {
        expect(completion.label.toLowerCase()).toMatch(/^up/);
      });
      
      expect(completions.find(c => c.label === 'upcase')).toBeDefined();
    });

    it('should handle case-insensitive filtering', () => {
      const completions = createLiquidFilterCompletions(mockRange, 'UP');
      
      expect(completions.length).toBeGreaterThan(0);
      expect(completions.find(c => c.label === 'upcase')).toBeDefined();
    });

    it('should return empty array for non-matching prefix', () => {
      const completions = createLiquidFilterCompletions(mockRange, 'zzz');
      
      expect(completions).toHaveLength(0);
    });

    it('should include snippet insertText for filters with parameters', () => {
      const completions = createLiquidFilterCompletions(mockRange, 'append');
      const appendFilter = completions.find(c => c.label === 'append');
      
      expect(appendFilter).toBeDefined();
      expect(appendFilter?.insertText).toContain('$');
      expect(appendFilter?.insertTextRules).toBe(monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet);
    });

    it('should not use snippet insertText for simple filters', () => {
      const completions = createLiquidFilterCompletions(mockRange, 'upcase');
      const upcaseFilter = completions.find(c => c.label === 'upcase');
      
      expect(upcaseFilter).toBeDefined();
      expect(upcaseFilter?.insertText).not.toContain('$');
      expect(upcaseFilter?.insertTextRules).toBe(monaco.languages.CompletionItemInsertTextRule.None);
    });

    it('should include proper documentation with examples', () => {
      const completions = createLiquidFilterCompletions(mockRange, 'json');
      const jsonFilter = completions.find(c => c.label === 'json');
      
      expect(jsonFilter).toBeDefined();
      expect(jsonFilter?.documentation).toBeDefined();
      expect(typeof jsonFilter?.documentation).toBe('object');
      expect((jsonFilter?.documentation as any)?.value).toContain('**json**');
      expect((jsonFilter?.documentation as any)?.value).toContain('Example:');
    });
  });

  describe('createLiquidSyntaxCompletions', () => {
    it('should return expected syntax completions', () => {
      const completions = createLiquidSyntaxCompletions(mockRange);
      
      expect(completions.length).toBeGreaterThan(0);
      
      const labels = completions.map(c => c.label);
      expect(labels).toContain('if');
      expect(labels).toContain('unless');
      expect(labels).toContain('for');
      expect(labels).toContain('case');
      expect(labels).toContain('assign');
      expect(labels).toContain('capture');
    });

    it('should return completions with proper structure', () => {
      const completions = createLiquidSyntaxCompletions(mockRange);
      
      completions.forEach(completion => {
        expect(completion).toHaveProperty('label');
        expect(completion).toHaveProperty('kind', monaco.languages.CompletionItemKind.Keyword);
        expect(completion).toHaveProperty('detail');
        expect(completion).toHaveProperty('documentation');
        expect(completion).toHaveProperty('insertText');
        expect(completion).toHaveProperty('insertTextRules', monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet);
        expect(completion).toHaveProperty('range', mockRange);
        
        // All syntax completions should be snippets with placeholders
        expect(completion.insertText).toContain('$');
      });
    });

    it('should include if statement with proper structure', () => {
      const completions = createLiquidSyntaxCompletions(mockRange);
      const ifCompletion = completions.find(c => c.label === 'if');
      
      expect(ifCompletion).toBeDefined();
      expect(ifCompletion?.insertText).toContain('{% if ');
      expect(ifCompletion?.insertText).toContain('{% endif %}');
      expect(ifCompletion?.insertText).toContain('${1:condition}');
      expect(ifCompletion?.insertText).toContain('${2:content}');
    });

    it('should include for loop with proper structure', () => {
      const completions = createLiquidSyntaxCompletions(mockRange);
      const forCompletion = completions.find(c => c.label === 'for');
      
      expect(forCompletion).toBeDefined();
      expect(forCompletion?.insertText).toContain('{% for ');
      expect(forCompletion?.insertText).toContain('{% endfor %}');
      expect(forCompletion?.insertText).toContain('${1:item}');
      expect(forCompletion?.insertText).toContain('${2:collection}');
      expect(forCompletion?.insertText).toContain('${3:content}');
    });

    it('should include assign statement with proper structure', () => {
      const completions = createLiquidSyntaxCompletions(mockRange);
      const assignCompletion = completions.find(c => c.label === 'assign');
      
      expect(assignCompletion).toBeDefined();
      expect(assignCompletion?.insertText).toContain('{% assign ');
      expect(assignCompletion?.insertText).toContain('${1:variable}');
      expect(assignCompletion?.insertText).toContain('${2:value}');
    });
  });
});
