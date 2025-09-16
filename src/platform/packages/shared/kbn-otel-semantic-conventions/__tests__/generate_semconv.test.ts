/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { processSemconvYaml, extractFirstExample } from '../src/lib/generate_semconv';
import type { ResolvedSemconvYaml, YamlGroup } from '../src/types/semconv_types';

// Test data fixtures
const mockRegistryGroup: YamlGroup = {
  id: 'registry.webengine',
  type: 'attribute_group',
  brief:
    '|\n    This document defines the attributes used to describe the packaged software running the application code.',
  stability: 'development',
  attributes: [
    {
      name: 'webengine.name',
      type: 'string',
      brief: '|\n      The name of the web engine.',
      requirement_level: 'recommended',
      stability: 'development',
    },
    {
      name: 'webengine.version',
      type: 'string',
      brief: '|\n      The version of the web engine.',
      requirement_level: 'recommended',
      stability: 'development',
    },
    {
      name: 'webengine.description',
      type: 'string',
      brief:
        '|\n      Additional description of the web engine (e.g. detailed version and edition information).',
      requirement_level: 'recommended',
      stability: 'development',
    },
  ],
};

const mockMetricGroup: YamlGroup = {
  id: 'metric.go.memory.used',
  type: 'metric',
  brief: 'Memory used by the Go runtime.',
  note: '|\n    Computed from `(/memory/classes/total:bytes - /memory/classes/heap/released:bytes)`.',
  stability: 'development',
  metric_name: 'go.memory.used',
  attributes: [
    {
      name: 'go.memory.type',
      type: 'string',
      brief: 'The type of memory.',
      requirement_level: 'recommended',
      stability: 'development',
    },
  ],
};

const mockDeprecatedGroup: YamlGroup = {
  id: 'registry.deprecated',
  type: 'attribute_group',
  brief: 'Deprecated group',
  deprecated: {
    reason: 'renamed',
    renamed_to: 'registry.new',
  },
  attributes: [
    {
      name: 'deprecated.field',
      type: 'string',
      brief: 'This field is deprecated',
      deprecated: true,
    },
  ],
};

const mockNonTargetGroup: YamlGroup = {
  id: 'spans.http',
  type: 'span',
  brief: 'HTTP span attributes',
  attributes: [
    {
      name: 'http.method',
      type: 'string',
      brief: 'HTTP request method',
    },
  ],
};

describe('generate_semconv', () => {
  let tempDir: string;
  let tempYamlFile: string;

  beforeEach(() => {
    // Create temporary directory and file for testing
    tempDir = fs.mkdtempSync(path.join(__dirname, 'tmp-'));
    tempYamlFile = path.join(tempDir, 'test-semconv.yaml');
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const createTestYamlFile = (groups: YamlGroup[]) => {
    const yamlContent: ResolvedSemconvYaml = { groups };
    fs.writeFileSync(tempYamlFile, yaml.dump(yamlContent), 'utf8');
  };

  describe('registry group processing', () => {
    it('should extract attributes from registry groups', () => {
      createTestYamlFile([mockRegistryGroup]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.registryFields).toEqual({
        'webengine.name': {
          name: 'webengine.name',
          description: 'The name of the web engine.',
          type: 'keyword',
        },
        'webengine.version': {
          name: 'webengine.version',
          description: 'The version of the web engine.',
          type: 'keyword',
        },
        'webengine.description': {
          name: 'webengine.description',
          description:
            'Additional description of the web engine (e.g. detailed version and edition information).',
          type: 'keyword',
        },
      });

      expect(result.stats.registryGroups).toBe(1);
      expect(Object.keys(result.registryFields)).toHaveLength(3);
    });

    it('should clean brief text properly', () => {
      const groupWithDirtyBrief: YamlGroup = {
        id: 'registry.test',
        type: 'attribute_group',
        brief: 'Test group',
        attributes: [
          {
            name: 'test.field',
            type: 'string',
            brief:
              '|\n      This is a test field with\n      multiple lines and\n      pipe characters.',
          },
        ],
      };

      createTestYamlFile([groupWithDirtyBrief]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.registryFields['test.field']).toEqual({
        name: 'test.field',
        description: 'This is a test field with multiple lines and pipe characters.',
        type: 'keyword',
      });
    });

    it('should skip registry groups without attributes', () => {
      const emptyGroup: YamlGroup = {
        id: 'registry.empty',
        type: 'attribute_group',
        brief: 'Empty group',
        // No attributes
      };

      createTestYamlFile([emptyGroup]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.registryFields).toEqual({});
      expect(result.stats.registryGroups).toBe(1);
    });

    it('should skip attributes without name or brief', () => {
      const incompleteGroup: YamlGroup = {
        id: 'registry.incomplete',
        type: 'attribute_group',
        brief: 'Group with incomplete attributes',
        attributes: [
          {
            name: 'valid.field',
            type: 'string',
            brief: 'Valid field',
          },
          {
            // Missing name
            type: 'string',
            brief: 'Field without name',
          },
          {
            name: 'field.without.brief',
            type: 'string',
            // Missing brief
          },
        ],
      };

      createTestYamlFile([incompleteGroup]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.registryFields).toEqual({
        'valid.field': {
          name: 'valid.field',
          description: 'Valid field',
          type: 'keyword',
        },
      });
    });
  });

  describe('metric group processing', () => {
    it('should extract metric name and attributes', () => {
      createTestYamlFile([mockMetricGroup]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.metricFields).toEqual({
        'metrics.go.memory.used': {
          name: 'metrics.go.memory.used',
          description: 'Memory used by the Go runtime.',
          type: 'double',
        },
        'go.memory.type': {
          name: 'go.memory.type',
          description: 'The type of memory.',
          type: 'keyword',
        },
      });

      expect(result.stats.metricGroups).toBe(1);
      expect(Object.keys(result.metricFields)).toHaveLength(2);
    });

    it('should handle metrics without attributes', () => {
      const metricWithoutAttrs: YamlGroup = {
        id: 'metric.simple',
        type: 'metric',
        brief: 'Simple metric without attributes',
        metric_name: 'simple.metric',
      };

      createTestYamlFile([metricWithoutAttrs]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.metricFields).toEqual({
        'metrics.simple': {
          name: 'metrics.simple',
          description: 'Simple metric without attributes',
          type: 'double',
        },
      });
    });

    it('should handle metrics without metric_name', () => {
      const metricWithoutName: YamlGroup = {
        id: 'metric.no_name',
        type: 'metric',
        brief: 'Metric without metric_name',
        attributes: [
          {
            name: 'test.attribute',
            brief: 'Test attribute',
          },
        ],
      };

      createTestYamlFile([metricWithoutName]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.metricFields).toEqual({
        'metrics.no_name': {
          name: 'metrics.no_name',
          description: 'Metric without metric_name',
          type: 'double',
        },
        'test.attribute': {
          name: 'test.attribute',
          description: 'Test attribute',
          type: 'keyword',
        },
      });
    });
  });

  describe('group filtering', () => {
    it('should only process registry and metric groups', () => {
      createTestYamlFile([mockRegistryGroup, mockMetricGroup, mockNonTargetGroup]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.stats.registryGroups).toBe(1);
      expect(result.stats.metricGroups).toBe(1);
      expect(result.stats.totalGroups).toBe(2);

      // Should not include fields from non-target group
      expect(result.totalFields).not.toHaveProperty('http.method');
    });

    it('should skip non-registry/metric groups', () => {
      createTestYamlFile([mockNonTargetGroup]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.stats.registryGroups).toBe(0);
      expect(result.stats.metricGroups).toBe(0);
      expect(result.registryFields).toEqual({});
      expect(result.metricFields).toEqual({});
      // totalFields will still contain hardcoded fields
      expect(Object.keys(result.totalFields)).toEqual(Object.keys(result.hardcodedFields));
    });
  });

  describe('deprecated field handling', () => {
    it('should exclude deprecated fields by default', () => {
      createTestYamlFile([mockDeprecatedGroup]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.registryFields).toEqual({});
    });

    it('should include deprecated fields when option is enabled', () => {
      createTestYamlFile([mockDeprecatedGroup]);

      const result = processSemconvYaml(tempYamlFile, { includeDeprecated: true });

      expect(result.registryFields).toEqual({
        'deprecated.field': {
          name: 'deprecated.field',
          description: 'This field is deprecated',
          type: 'keyword',
        },
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty groups array', () => {
      createTestYamlFile([]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.stats.totalGroups).toBe(0);
      expect(result.registryFields).toEqual({});
      expect(result.metricFields).toEqual({});
      // totalFields should only contain hardcoded fields
      expect(Object.keys(result.totalFields)).toEqual(Object.keys(result.hardcodedFields));
    });

    it('should throw error for invalid YAML file', () => {
      fs.writeFileSync(tempYamlFile, 'invalid: yaml: content: [', 'utf8');

      expect(() => {
        processSemconvYaml(tempYamlFile);
      }).toThrow('Failed to load YAML file');
    });

    it('should throw error for missing groups property', () => {
      fs.writeFileSync(tempYamlFile, yaml.dump({ invalid: 'structure' }), 'utf8');

      expect(() => {
        processSemconvYaml(tempYamlFile);
      }).toThrow('Invalid YAML structure');
    });

    it('should throw error for non-existent file', () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.yaml');

      expect(() => {
        processSemconvYaml(nonExistentFile);
      }).toThrow('Failed to load YAML file');
    });

    it('should handle groups with missing properties gracefully', () => {
      const malformedGroup: YamlGroup = {
        id: 'registry.malformed',
        type: 'attribute_group',
        // Missing brief, attributes, etc.
      };

      createTestYamlFile([malformedGroup]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.registryFields).toEqual({});
      expect(result.stats.registryGroups).toBe(1);
    });
  });

  describe('output validation', () => {
    it('should merge hardcoded, registry and metric fields correctly', () => {
      createTestYamlFile([mockRegistryGroup, mockMetricGroup]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.totalFields).toEqual({
        ...result.hardcodedFields,
        ...result.registryFields,
        ...result.metricFields,
      });

      expect(result.stats.totalFields).toBe(
        Object.keys(result.hardcodedFields).length +
          Object.keys(result.registryFields).length +
          Object.keys(result.metricFields).length
      );
    });

    it('should handle field name collisions (metric fields win)', () => {
      const registryWithCollision: YamlGroup = {
        id: 'registry.collision',
        type: 'attribute_group',
        brief: 'Registry group',
        attributes: [
          {
            name: 'collision.field',
            brief: 'Registry field description',
          },
        ],
      };

      const metricWithCollision: YamlGroup = {
        id: 'metric.collision',
        type: 'metric',
        brief: 'Metric group',
        metric_name: 'collision.field',
        attributes: [],
      };

      createTestYamlFile([registryWithCollision, metricWithCollision]);

      const result = processSemconvYaml(tempYamlFile);

      // Both registry and metric fields should exist (no collision since different names)
      expect(result.totalFields['collision.field']).toEqual({
        name: 'collision.field',
        description: 'Registry field description',
        type: 'keyword',
      });

      expect(result.totalFields['metrics.collision']).toEqual({
        name: 'metrics.collision',
        description: 'Metric group',
        type: 'double',
      });
    });
  });

  describe('processing options', () => {
    it('should respect cleanBriefText option', () => {
      createTestYamlFile([mockRegistryGroup]);

      const result = processSemconvYaml(tempYamlFile, { cleanBriefText: false });

      // Should preserve original formatting
      expect(result.registryFields['webengine.name']).toEqual({
        name: 'webengine.name',
        description: '|\n      The name of the web engine.',
        type: 'keyword',
      });
    });
  });

  describe('hardcoded mappings integration', () => {
    it('should include hardcoded fields in result', () => {
      createTestYamlFile([]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.hardcodedFields).toBeDefined();
      expect(Object.keys(result.hardcodedFields).length).toBeGreaterThan(0);
      expect(result.stats.hardcodedFields).toBeGreaterThan(0);
    });

    it('should include core OTLP fields in hardcoded mappings', () => {
      createTestYamlFile([]);

      const result = processSemconvYaml(tempYamlFile);

      // Check for key OTLP fields
      expect(result.hardcodedFields['@timestamp']).toEqual({
        name: '@timestamp',
        description: expect.stringContaining('Time when'),
        type: 'date_nanos',
      });

      expect(result.hardcodedFields.trace_id).toEqual({
        name: 'trace_id',
        description: 'A unique identifier for a trace.',
        type: 'keyword',
      });

      expect(result.hardcodedFields['scope.name']).toEqual({
        name: 'scope.name',
        description: 'The name of the instrumentation scope that produced the span.',
        type: 'keyword',
      });
    });

    it('should allow semantic convention fields to override hardcoded fields', () => {
      // Create a registry group that conflicts with a hardcoded field
      const conflictingGroup: YamlGroup = {
        id: 'registry.test',
        type: 'attribute_group',
        brief: 'Test group',
        attributes: [
          {
            name: '@timestamp',
            brief: 'Custom timestamp description from semantic conventions',
            type: 'string',
          },
        ],
      };

      createTestYamlFile([conflictingGroup]);

      const result = processSemconvYaml(tempYamlFile);

      // Semantic convention should override hardcoded field
      expect(result.totalFields['@timestamp']).toEqual({
        name: '@timestamp',
        description: 'Custom timestamp description from semantic conventions',
        type: 'keyword', // string maps to keyword
      });

      // But hardcoded field should still exist separately
      expect(result.hardcodedFields['@timestamp']).toEqual({
        name: '@timestamp',
        description: expect.stringContaining('Time when'),
        type: 'date_nanos',
      });
    });

    it('should properly count all field sources', () => {
      createTestYamlFile([mockRegistryGroup, mockMetricGroup]);

      const result = processSemconvYaml(tempYamlFile);

      expect(result.stats.hardcodedFields).toBeGreaterThan(0);
      expect(result.stats.registryGroups).toBe(1);
      expect(result.stats.metricGroups).toBe(1);

      // Total should include all sources
      const expectedTotal =
        Object.keys(result.hardcodedFields).length +
        Object.keys(result.registryFields).length +
        Object.keys(result.metricFields).length;

      expect(result.stats.totalFields).toBe(expectedTotal);
    });

    it('should maintain field structure consistency across all sources', () => {
      createTestYamlFile([mockRegistryGroup, mockMetricGroup]);

      const result = processSemconvYaml(tempYamlFile);

      // Check that all field sources have consistent structure
      [result.hardcodedFields, result.registryFields, result.metricFields].forEach(
        (fieldSource) => {
          Object.entries(fieldSource).forEach(([fieldName, fieldMetadata]) => {
            expect(fieldMetadata).toHaveProperty('name');
            expect(fieldMetadata).toHaveProperty('description');
            expect(fieldMetadata).toHaveProperty('type');

            expect(fieldMetadata.name).toBe(fieldName);
            expect(typeof fieldMetadata.description).toBe('string');
            expect(typeof fieldMetadata.type).toBe('string');
          });
        }
      );
    });
  });

  describe('extractFirstExample function', () => {
    describe('JSON compaction', () => {
      it('should compact the problematic gen_ai.system_instructions multi-line JSON', () => {
        const problematicExample = `[
  {
    "type": "text",
    "content": "You are an Agent that greet users, always use greetings tool to respond"
  }
]`;
        const result = extractFirstExample([problematicExample]);
        expect(result).toBe(
          '[{"type":"text","content":"You are an Agent that greet users, always use greetings tool to respond"}]'
        );
        // Ensure no newlines in the result
        expect(result).not.toContain('\n');
      });

      it('should compact multi-line JSON objects', () => {
        const multiLineJson = `{
  "name": "service-name",
  "version": "1.0.0"  
}`;
        const result = extractFirstExample([multiLineJson]);
        expect(result).toBe('{"name":"service-name","version":"1.0.0"}');
        expect(result).not.toContain('\n');
      });

      it('should handle complex nested JSON arrays', () => {
        const complexExample = `[
  {"type": "text", "content": "You are a language translator."},
  {"type": "text", "content": "Your mission is to translate text."}
]`;
        const result = extractFirstExample([complexExample]);
        expect(result).toBe(
          '[{"type":"text","content":"You are a language translator."},{"type":"text","content":"Your mission is to translate text."}]'
        );
      });
    });

    describe('string normalization', () => {
      it('should normalize multi-line strings with extra whitespace', () => {
        const multiLineString = `This is a
        multi-line string
        with    extra    spaces`;
        const result = extractFirstExample([multiLineString]);
        expect(result).toBe('This is a multi-line string with extra spaces');
      });

      it('should trim whitespace from simple strings', () => {
        const paddedString = '   simple string   ';
        const result = extractFirstExample([paddedString]);
        expect(result).toBe('simple string');
      });

      it('should handle invalid JSON as plain text', () => {
        const invalidJson = '{ invalid: json, missing: "quotes" }';
        const result = extractFirstExample([invalidJson]);
        expect(result).toBe('{ invalid: json, missing: "quotes" }');
      });
    });

    describe('edge cases and data types', () => {
      it('should return undefined for empty or invalid inputs', () => {
        expect(extractFirstExample([])).toBeUndefined();
        expect(extractFirstExample(undefined)).toBeUndefined();
        expect(extractFirstExample([null])).toBeUndefined();
        expect(extractFirstExample([undefined])).toBeUndefined();
      });

      it('should handle various data types', () => {
        expect(extractFirstExample(['simple string'])).toBe('simple string');
        expect(extractFirstExample([42])).toBe('42');
        expect(extractFirstExample([true])).toBe('true');
        expect(extractFirstExample([''])).toBe('');
      });

      it('should process OpenTelemetry field examples correctly', () => {
        expect(extractFirstExample(['shoppingcart'])).toBe('shoppingcart');
        expect(extractFirstExample(['21.0.0'])).toBe('21.0.0');
        expect(extractFirstExample(['GET'])).toBe('GET');
        expect(extractFirstExample(['stack'])).toBe('stack');
      });
    });
  });
});
