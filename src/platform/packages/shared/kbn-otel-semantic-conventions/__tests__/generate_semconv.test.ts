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

describe('OpenTelemetry Semantic Conventions Processing', () => {
  let tempDir: string;
  let tempYamlFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(__dirname, 'temp-'));
    tempYamlFile = path.join(tempDir, 'test.yaml');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const createYamlFile = (groups: YamlGroup[]) => {
    const yamlContent: ResolvedSemconvYaml = { groups };
    fs.writeFileSync(tempYamlFile, yaml.dump(yamlContent), 'utf8');
  };

  describe('Deterministic Ordering for PR Diffs', () => {
    it('produces identical output across multiple executions to eliminate diff noise', () => {
      // Real-world scenario: Weekly automated PRs should have minimal diffs
      const complexGroups: YamlGroup[] = [
        {
          id: 'registry.user',
          type: 'attribute_group',
          brief: 'User attributes',
          attributes: [
            { name: 'user.name', brief: 'Username', type: 'string' },
            { name: 'user.id', brief: 'User ID', type: 'string' },
            { name: 'user.email', brief: 'Email', type: 'string' },
          ],
        },
        {
          id: 'metric.system.cpu',
          type: 'metric',
          brief: 'CPU usage',
          attributes: [{ name: 'cpu.state', brief: 'CPU state', type: 'string' }],
        },
      ];

      createYamlFile(complexGroups);

      // Execute multiple times to simulate CI runs
      const results = Array.from({ length: 5 }, () => processSemconvYaml(tempYamlFile));

      // Convert to JSON strings to simulate what would be written to files
      const serializedResults = results.map((r) => JSON.stringify(r.totalFields, null, 2));

      // All outputs must be identical to prevent unnecessary PR diffs
      const baseline = serializedResults[0];
      serializedResults.forEach((result, index) => {
        expect(result).toBe(baseline);
      });

      // Verify field order is deterministic
      const fieldOrders = results.map((r) => Object.keys(r.totalFields));
      const baselineOrder = fieldOrders[0];
      fieldOrders.forEach((order) => {
        expect(order).toEqual(baselineOrder);
      });
    });

    it('handles large datasets without crashing', () => {
      // Simulate real OpenTelemetry registry size (~1000+ fields)
      const largeGroups: YamlGroup[] = Array.from({ length: 50 }, (_, i) => ({
        id: `registry.test_${i}`,
        type: 'attribute_group',
        brief: `Test group ${i}`,
        attributes: Array.from({ length: 20 }, (__, j) => ({
          name: `field_${i}_${j}`,
          brief: `Test field ${i}_${j}`,
          type: 'string',
        })),
      }));

      createYamlFile(largeGroups);

      // Should process large datasets without throwing errors
      const result = processSemconvYaml(tempYamlFile);

      // Verify it processed the expected number of fields
      expect(Object.keys(result.totalFields).length).toBeGreaterThan(1000);
      expect(result.stats.totalFields).toBeGreaterThan(1000);
    });

    it('maintains alphabetical ordering consistency', () => {
      const testGroups: YamlGroup[] = [
        {
          id: 'registry.mixed',
          type: 'attribute_group',
          brief: 'Mixed fields for ordering test',
          attributes: [
            { name: 'zebra.field', brief: 'Last alphabetically', type: 'string' },
            { name: 'alpha.field', brief: 'First alphabetically', type: 'string' },
            { name: 'beta.field', brief: 'Middle alphabetically', type: 'string' },
          ],
        },
      ];

      createYamlFile(testGroups);
      const result = processSemconvYaml(tempYamlFile);
      const fieldKeys = Object.keys(result.totalFields);

      // Fields should be in alphabetical order
      const sortedKeys = [...fieldKeys].sort();
      expect(fieldKeys).toEqual(sortedKeys);

      // @timestamp should be first (from hardcoded mappings)
      expect(fieldKeys[0]).toBe('@timestamp');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed YAML gracefully', () => {
      fs.writeFileSync(tempYamlFile, 'invalid: yaml: content: [', 'utf8');

      expect(() => processSemconvYaml(tempYamlFile)).toThrow(/Failed to load YAML file/);
    });

    it('handles missing groups property', () => {
      fs.writeFileSync(tempYamlFile, yaml.dump({ notGroups: [] }), 'utf8');

      expect(() => processSemconvYaml(tempYamlFile)).toThrow(
        /missing or invalid "groups" property/
      );
    });

    it('handles non-existent files', () => {
      expect(() => processSemconvYaml('/non/existent/file.yaml')).toThrow();
    });

    it('handles empty attribute arrays', () => {
      createYamlFile([
        {
          id: 'registry.empty',
          type: 'attribute_group',
          brief: 'Empty group',
          attributes: [],
        },
      ]);

      const result = processSemconvYaml(tempYamlFile);
      expect(result.registryFields).toEqual({});
    });
  });

  describe('Integration with Hardcoded Mappings', () => {
    it('includes core OTLP fields in hardcoded mappings', () => {
      createYamlFile([]);

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

    it('prioritizes semantic conventions over hardcoded mappings correctly', () => {
      // Test the business rule: YAML fields override hardcoded ones
      const overrideGroup: YamlGroup = {
        id: 'registry.override',
        type: 'attribute_group',
        brief: 'Override test',
        attributes: [
          {
            name: 'trace_id', // This exists in hardcoded mappings
            brief: 'Custom trace ID description from YAML',
            type: 'string',
          },
        ],
      };

      createYamlFile([overrideGroup]);
      const result = processSemconvYaml(tempYamlFile);

      // YAML should win
      expect(result.totalFields.trace_id.description).toBe('Custom trace ID description from YAML');
      expect(result.totalFields.trace_id.type).toBe('keyword'); // string -> keyword

      // But hardcoded should still exist separately
      expect(result.hardcodedFields.trace_id.description).toBe('A unique identifier for a trace.');
    });
  });

  describe('Metric Processing Business Logic', () => {
    it('transforms metric IDs to Kibana field names correctly', () => {
      const metricGroup: YamlGroup = {
        id: 'metric.go.memory.used',
        type: 'metric',
        brief: 'Memory used by Go runtime',
        unit: 'bytes',
      };

      createYamlFile([metricGroup]);
      const result = processSemconvYaml(tempYamlFile);

      // Business rule: metric.* -> metrics.*
      expect(result.metricFields['metrics.go.memory.used']).toBeDefined();
      expect(result.metricFields['metrics.go.memory.used'].name).toBe('metrics.go.memory.used');
      expect(result.metricFields['metrics.go.memory.used'].type).toBe('double');
    });

    it('processes metric attributes correctly', () => {
      const metricGroup: YamlGroup = {
        id: 'metric.system.cpu',
        type: 'metric',
        brief: 'CPU usage',
        attributes: [
          { name: 'cpu.state', brief: 'CPU state', type: 'string' },
          { name: 'cpu.core', brief: 'CPU core', type: 'int' },
        ],
      };

      createYamlFile([metricGroup]);
      const result = processSemconvYaml(tempYamlFile);

      // Metric itself
      expect(result.metricFields['metrics.system.cpu']).toBeDefined();
      expect(result.metricFields['metrics.system.cpu'].type).toBe('double');

      // Metric attributes
      expect(result.metricFields['cpu.state']).toBeDefined();
      expect(result.metricFields['cpu.state'].type).toBe('keyword');
      expect(result.metricFields['cpu.core']).toBeDefined();
      expect(result.metricFields['cpu.core'].type).toBe('long');
    });
  });

  describe('Deprecation Handling', () => {
    it('excludes deprecated fields by default', () => {
      const testGroup: YamlGroup = {
        id: 'registry.deprecated',
        type: 'attribute_group',
        brief: 'Deprecated group',
        attributes: [
          { name: 'old.field', brief: 'Old field', type: 'string', deprecated: true },
          { name: 'current.field', brief: 'Current field', type: 'string' },
        ],
      };

      createYamlFile([testGroup]);
      const result = processSemconvYaml(tempYamlFile);

      expect(result.totalFields['old.field']).toBeUndefined();
      expect(result.totalFields['current.field']).toBeDefined();
    });

    it('includes deprecated fields when explicitly requested', () => {
      const testGroup: YamlGroup = {
        id: 'registry.deprecated',
        type: 'attribute_group',
        brief: 'Deprecated group',
        attributes: [{ name: 'old.field', brief: 'Old field', type: 'string', deprecated: true }],
      };

      createYamlFile([testGroup]);
      const result = processSemconvYaml(tempYamlFile, { includeDeprecated: true });

      expect(result.totalFields['old.field']).toBeDefined();
    });

    it('excludes deprecated metric groups by default', () => {
      const deprecatedMetric: YamlGroup = {
        id: 'metric.old.counter',
        type: 'metric',
        brief: 'Old metric',
        deprecated: { reason: 'Old metric' },
      };

      createYamlFile([deprecatedMetric]);
      const result = processSemconvYaml(tempYamlFile);

      expect(result.metricFields['metrics.old.counter']).toBeUndefined();
    });
  });

  describe('extractFirstExample function', () => {
    describe('JSON compaction', () => {
      it('should compact multi-line JSON to prevent TypeScript generation issues', () => {
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
    });

    describe('string normalization', () => {
      it('should normalize multi-line strings with extra whitespace', () => {
        const multiLineString = `This is a
        multi-line string
        with    extra    spaces`;
        const result = extractFirstExample([multiLineString]);
        expect(result).toBe('This is a multi-line string with extra spaces');
      });

      it('should handle invalid JSON as plain text', () => {
        const invalidJson = '{ invalid: json, missing: "quotes" }';
        const result = extractFirstExample([invalidJson]);
        expect(result).toBe('{ invalid: json, missing: "quotes" }');
      });
    });

    describe('edge cases', () => {
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
    });
  });
});
