/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { scriptPanelCodeSchema, scriptPanelEmbeddableSchema } from './schemas';

describe('Script Panel Schemas', () => {
  describe('scriptPanelCodeSchema', () => {
    it('should accept valid script_code', () => {
      const validInput = {
        script_code: 'Kibana.render.setContent("<h1>Hello</h1>");',
      };

      expect(() => scriptPanelCodeSchema.validate(validInput)).not.toThrow();
    });

    it('should accept empty script_code', () => {
      const validInput = {
        script_code: '',
      };

      expect(() => scriptPanelCodeSchema.validate(validInput)).not.toThrow();
    });

    it('should default script_code to empty string', () => {
      const emptyInput = {};

      const result = scriptPanelCodeSchema.validate(emptyInput);
      expect(result.script_code).toBe('');
    });

    it('should reject non-string script_code', () => {
      const invalidInput = {
        script_code: 123,
      };

      expect(() => scriptPanelCodeSchema.validate(invalidInput)).toThrow();
    });

    it('should use snake_case field name for REST API compatibility', () => {
      // The field should be snake_case for REST API
      const input = { script_code: 'test' };
      const result = scriptPanelCodeSchema.validate(input);

      expect(result).toHaveProperty('script_code');
      expect(result).not.toHaveProperty('scriptCode');
    });
  });

  describe('scriptPanelEmbeddableSchema', () => {
    it('should accept valid embeddable state with script_code', () => {
      const validInput = {
        script_code: 'console.log("test");',
      };

      expect(() => scriptPanelEmbeddableSchema.validate(validInput)).not.toThrow();
    });

    it('should accept state with title', () => {
      const validInput = {
        script_code: '// code',
        title: 'My Script Panel',
      };

      const result = scriptPanelEmbeddableSchema.validate(validInput);
      expect(result.title).toBe('My Script Panel');
    });

    it('should accept state with description', () => {
      const validInput = {
        script_code: '// code',
        description: 'A custom visualization',
      };

      const result = scriptPanelEmbeddableSchema.validate(validInput);
      expect(result.description).toBe('A custom visualization');
    });

    it('should accept state with hide_title', () => {
      const validInput = {
        script_code: '// code',
        hide_title: true,
      };

      const result = scriptPanelEmbeddableSchema.validate(validInput);
      expect(result.hide_title).toBe(true);
    });

    it('should accept complete embeddable state', () => {
      const completeInput = {
        script_code: 'Kibana.esql.query({ query: "FROM logs | LIMIT 10" });',
        title: 'Log Viewer',
        description: 'Displays recent logs',
        hide_title: false,
      };

      const result = scriptPanelEmbeddableSchema.validate(completeInput);
      expect(result.script_code).toBe(completeInput.script_code);
      expect(result.title).toBe(completeInput.title);
      expect(result.description).toBe(completeInput.description);
    });

    it('should accept minimal state with defaults', () => {
      const minimalInput = {};

      const result = scriptPanelEmbeddableSchema.validate(minimalInput);
      expect(result.script_code).toBe('');
    });

    it('should reject invalid script_code type', () => {
      const invalidInput = {
        script_code: ['not', 'a', 'string'],
      };

      expect(() => scriptPanelEmbeddableSchema.validate(invalidInput)).toThrow();
    });

    it('should reject invalid title type', () => {
      const invalidInput = {
        script_code: '// code',
        title: { nested: 'object' },
      };

      expect(() => scriptPanelEmbeddableSchema.validate(invalidInput)).toThrow();
    });
  });

  describe('schema structure', () => {
    it('should maintain snake_case convention for REST API', () => {
      // This test documents the intentional use of snake_case
      // for REST API compatibility
      const input = {
        script_code: 'test',
        // Note: title fields from serializedTitlesSchema may have different conventions
      };

      const result = scriptPanelCodeSchema.validate(input);

      // Field should be snake_case
      expect(Object.keys(result)).toContain('script_code');
    });
  });
});
