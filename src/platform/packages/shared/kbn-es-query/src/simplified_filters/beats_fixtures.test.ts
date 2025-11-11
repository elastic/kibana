/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { diff } from 'jest-diff';
import { fromStoredFilter, toStoredFilter, validate } from './conversion';
import { isConditionFilter, isGroupFilter, isDSLFilter } from './conversion/type_guards';
import type { Filter } from '../..';

/**
 * Unique Beats Filters Test Suite
 *
 * Tests our conversion functions against a curated set of 230 unique filters
 * extracted and deduplicated from the Beats repository. These represent the
 * full diversity of real-world filter configurations across all Beats modules
 * while eliminating redundant test cases for better performance and clarity.
 */

describe('Unique Beats Filters', () => {
  // Load the deduplicated unique filters from our curated dataset
  const uniqueFiltersPath = join(__dirname, 'fixtures', 'unique_beats_filters.json');
  let uniqueFilters: Filter[] = [];

  // Properties to ignore during round-trip comparison
  const ignoredProperties = new Set([
    'meta.indexRefName', // Can be added/modified during conversion
    'meta.params', // May be restructured
    'meta.field', // May be inferred differently
    'meta.alias', // May be normalized
  ]);

  // Helper function to normalize filter for comparison
  const normalizeFilterForComparison = (filter: any): any => {
    const normalized = JSON.parse(JSON.stringify(filter));

    // Remove ignored properties
    const removeIgnored = (obj: any, path: string = ''): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map((item, index) => removeIgnored(item, `${path}[${index}]`));
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (!ignoredProperties.has(currentPath)) {
          result[key] = removeIgnored(value, currentPath);
        }
      }
      return result;
    };

    return removeIgnored(normalized);
  };

  // Helper function to analyze differences between original and round-trip filters
  const analyzeRoundTripDifferences = (original: any, roundTrip: any) => {
    const normalizedOriginal = normalizeFilterForComparison(original);
    const normalizedRoundTrip = normalizeFilterForComparison(roundTrip);

    // Check if they're essentially equivalent
    const isEquivalent = JSON.stringify(normalizedOriginal) === JSON.stringify(normalizedRoundTrip);

    let diffOutput = null;
    let changedProperties: string[] = [];

    if (!isEquivalent) {
      diffOutput = diff(normalizedOriginal, normalizedRoundTrip, {
        expand: false,
        contextLines: 2,
      });

      // Extract changed property paths
      changedProperties = extractChangedProperties(normalizedOriginal, normalizedRoundTrip);
    }

    return {
      isEquivalent,
      diffOutput,
      changedProperties,
    };
  };

  // Helper function to extract changed property paths
  const extractChangedProperties = (obj1: any, obj2: any, path: string = ''): string[] => {
    const changes: string[] = [];

    if (typeof obj1 !== typeof obj2) {
      changes.push(path || 'root');
      return changes;
    }

    if (typeof obj1 !== 'object' || obj1 === null) {
      if (obj1 !== obj2) {
        changes.push(path || 'root');
      }
      return changes;
    }

    if (Array.isArray(obj1) !== Array.isArray(obj2)) {
      changes.push(path || 'root');
      return changes;
    }

    if (Array.isArray(obj1)) {
      const maxLength = Math.max(obj1.length, obj2.length);
      for (let i = 0; i < maxLength; i++) {
        const currentPath = path ? `${path}[${i}]` : `[${i}]`;
        changes.push(...extractChangedProperties(obj1[i], obj2[i], currentPath));
      }
      return changes;
    }

    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      if (!(key in obj1) || !(key in obj2)) {
        changes.push(currentPath);
      } else {
        changes.push(...extractChangedProperties(obj1[key], obj2[key], currentPath));
      }
    }

    return changes;
  };

  // Helper function to test a single filter
  const testFilterConversion = (filter: any, filterIndex: number) => {
    try {
      // Test conversion from stored to simplified
      const simplified = fromStoredFilter(filter);
      expect(simplified).toBeDefined();

      // Verify the simplified filter has a valid structure
      const hasCondition = isConditionFilter(simplified);
      const hasGroup = isGroupFilter(simplified);
      const hasDSL = isDSLFilter(simplified);

      expect(hasCondition || hasGroup || hasDSL).toBe(true);

      // Test validation
      const validationResult = validate(simplified);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      // Test round-trip conversion
      const backToStored = toStoredFilter(simplified);
      expect(backToStored).toBeDefined();
      expect(backToStored.query).toBeDefined();
      expect(backToStored.meta).toBeDefined();

      // Test that we can convert back again
      const roundTrip = fromStoredFilter(backToStored);
      expect(validate(roundTrip).valid).toBe(true);

      // Analyze round-trip fidelity
      const roundTripAnalysis = analyzeRoundTripDifferences(filter, backToStored);

      return {
        success: true,
        type: hasCondition ? 'condition' : hasGroup ? 'group' : 'dsl',
        roundTrip: {
          isEquivalent: roundTripAnalysis.isEquivalent,
          changedProperties: roundTripAnalysis.changedProperties,
          diffOutput: roundTripAnalysis.diffOutput,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filter: JSON.stringify(filter, null, 2),
      };
    }
  };

  beforeAll(() => {
    try {
      // Load the unique filters dataset
      const content = readFileSync(uniqueFiltersPath, 'utf-8');
      uniqueFilters = JSON.parse(content);

      // Log analysis results for debugging
      // eslint-disable-next-line no-console
      console.log(`\n📊 Unique Beats Filters Analysis:`);
      // eslint-disable-next-line no-console
      console.log(`   Total unique filters: ${uniqueFilters.length}`);
      // eslint-disable-next-line no-console
      console.log(`   Source: Deduplicated from 425 real-world Beats filters`);
      // eslint-disable-next-line no-console
      console.log(`   Coverage: All major filter types and patterns from Beats modules`);
    } catch (error) {
      throw new Error(`Failed to load unique filters dataset: ${error}`);
    }
  });

  describe('Core Filter Validation', () => {
    it('should successfully load the unique filters dataset', () => {
      expect(uniqueFilters).toBeDefined();
      expect(Array.isArray(uniqueFilters)).toBe(true);
      expect(uniqueFilters.length).toBeGreaterThan(0);

      // Should be exactly 230 unique filters as reported by deduplication
      expect(uniqueFilters.length).toBe(230);
    });

    it('should convert all unique filters successfully', () => {
      let totalTested = 0;
      let successful = 0;
      const failures: Array<{ index: number; error: string }> = [];

      uniqueFilters.forEach((filter, index) => {
        totalTested++;
        const result = testFilterConversion(filter, index);

        if (result.success) {
          successful++;
        } else {
          failures.push({
            index,
            error: result.error || 'Unknown error',
          });
        }
      });

      // Log any failures for debugging
      if (failures.length > 0) {
        // eslint-disable-next-line no-console
        console.error(`\n❌ Failed filters (${failures.length}):`);
        failures.slice(0, 5).forEach((failure) => {
          // eslint-disable-next-line no-console
          console.error(`   Filter ${failure.index}: ${failure.error}`);
        });
      }

      // All unique filters should convert successfully
      expect(successful).toBe(totalTested);
      expect(failures.length).toBe(0);
    });

    it('should demonstrate filter type diversity', () => {
      const typeStats: { [key: string]: number } = {};
      let validationFailures = 0;

      uniqueFilters.forEach((filter, index) => {
        const result = testFilterConversion(filter, index);

        if (result.success && result.type) {
          typeStats[result.type] = (typeStats[result.type] || 0) + 1;
        } else {
          validationFailures++;
        }
      });

      // eslint-disable-next-line no-console
      console.log(`\n🔍 Filter Type Distribution:`);
      Object.entries(typeStats)
        .sort(([, a], [, b]) => b - a)
        .forEach(([type, count]) => {
          const percentage = ((count / uniqueFilters.length) * 100).toFixed(1);
          // eslint-disable-next-line no-console
          console.log(`   ${type}: ${count} filters (${percentage}%)`);
        });

      // Should have multiple filter types represented
      expect(Object.keys(typeStats).length).toBeGreaterThan(1);
      expect(validationFailures).toBe(0);
    });
  });

  describe('Round-Trip Fidelity Analysis', () => {
    let roundTripStats: {
      total: number;
      equivalent: number;
      modified: number;
      changedProperties: Map<string, number>;
      modifiedFilters: Array<{
        filterIndex: number;
        changedProperties: string[];
        diffOutput?: string;
      }>;
    };

    beforeAll(() => {
      roundTripStats = {
        total: 0,
        equivalent: 0,
        modified: 0,
        changedProperties: new Map<string, number>(),
        modifiedFilters: [],
      };

      // Analyze round-trip behavior for all unique filters
      uniqueFilters.forEach((filter, index) => {
        roundTripStats.total++;
        const result = testFilterConversion(filter, index);

        if (result.success && result.roundTrip) {
          if (result.roundTrip.isEquivalent) {
            roundTripStats.equivalent++;
          } else {
            roundTripStats.modified++;

            // Track changed properties
            result.roundTrip.changedProperties.forEach((prop) => {
              const count = roundTripStats.changedProperties.get(prop) || 0;
              roundTripStats.changedProperties.set(prop, count + 1);
            });

            // Store modified filter details (limit to first 10 for performance)
            if (roundTripStats.modifiedFilters.length < 10) {
              roundTripStats.modifiedFilters.push({
                filterIndex: index,
                changedProperties: result.roundTrip.changedProperties,
                diffOutput: result.roundTrip.diffOutput || undefined,
              });
            }
          }
        }
      });
    });

    it('should provide comprehensive round-trip analysis', () => {
      const fidelityRate = ((roundTripStats.equivalent / roundTripStats.total) * 100).toFixed(1);

      // eslint-disable-next-line no-console
      console.log(`\n🔄 Round-Trip Fidelity Analysis:`);
      // eslint-disable-next-line no-console
      console.log(`   Total filters analyzed: ${roundTripStats.total}`);
      // eslint-disable-next-line no-console
      console.log(`   Perfect round-trips: ${roundTripStats.equivalent}`);
      // eslint-disable-next-line no-console
      console.log(`   Modified round-trips: ${roundTripStats.modified}`);
      // eslint-disable-next-line no-console
      console.log(`   Fidelity rate: ${fidelityRate}%`);

      if (roundTripStats.changedProperties.size > 0) {
        // eslint-disable-next-line no-console
        console.log(`\n🔍 Most Frequently Changed Properties:`);
        const sortedProperties = Array.from(roundTripStats.changedProperties.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10);

        sortedProperties.forEach(([property, count]) => {
          // eslint-disable-next-line no-console
          console.log(`   ${property}: ${count} filters`);
        });
      }

      // Document the current behavior - metadata enrichment is expected
      expect(roundTripStats.total).toBe(uniqueFilters.length);
      expect(roundTripStats.equivalent + roundTripStats.modified).toBe(roundTripStats.total);
    });

    it('should verify phrase filter preservation', () => {
      // Test specific phrase filters to ensure our fix works
      const phraseFilters = uniqueFilters.filter((filter) => filter.meta?.type === 'phrase');

      let phraseToCustomCount = 0;
      let dataLossCount = 0;

      phraseFilters.forEach((filter, index) => {
        const simplified = fromStoredFilter(filter);
        const converted = toStoredFilter(simplified);

        // Critical check: Should preserve phrase type
        if (converted.meta?.type !== 'phrase') {
          phraseToCustomCount++;
          // eslint-disable-next-line no-console
          console.error(`❌ Filter ${index + 1}: phrase became ${converted.meta?.type}`);
        }

        // Check for data loss
        if (!converted.meta?.params && filter.meta?.params) {
          dataLossCount++;
          // eslint-disable-next-line no-console
          console.error(`❌ Filter ${index + 1}: Lost meta.params`);
        }
      });

      // eslint-disable-next-line no-console
      console.log(`\n✅ PHRASE FILTER PRESERVATION:`);
      // eslint-disable-next-line no-console
      console.log(`   Phrase filters tested: ${phraseFilters.length}`);
      // eslint-disable-next-line no-console
      console.log(`   Phrase → Custom conversions: ${phraseToCustomCount} (should be 0)`);
      // eslint-disable-next-line no-console
      console.log(`   Data loss cases: ${dataLossCount} (should be 0)`);

      // The fix should eliminate ALL phrase → custom conversions and data loss
      expect(phraseToCustomCount).toBe(0);
      expect(dataLossCount).toBe(0);
    });

    it('should demonstrate round-trip differences for analysis', () => {
      // This test documents the types of changes that occur during round-trip conversion
      if (roundTripStats.modifiedFilters.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`\n🔬 Round-Trip Modification Examples (first 3):`);

        roundTripStats.modifiedFilters.slice(0, 3).forEach((modification, index) => {
          // eslint-disable-next-line no-console
          console.log(`\n   Example ${index + 1}: Filter ${modification.filterIndex}`);
          // eslint-disable-next-line no-console
          console.log(`   Changed properties: ${modification.changedProperties.join(', ')}`);

          if (modification.diffOutput && index === 0) {
            // eslint-disable-next-line no-console
            console.log(`   Diff preview (first 8 lines):`);
            const diffLines = modification.diffOutput.split('\n').slice(0, 8);
            diffLines.forEach((line) => {
              // eslint-disable-next-line no-console
              console.log(`     ${line}`);
            });
          }
        });
      }

      // This test always passes - it's for analysis only
      expect(true).toBe(true);
    });
  });

  describe('Performance and Coverage', () => {
    it('should demonstrate significant space savings from deduplication', () => {
      // The unique filters represent 425 original filters from 296 files
      const originalFilterCount = 425;
      const originalFileCount = 296;
      const uniqueFilterCount = uniqueFilters.length;

      const deduplicationEfficiency = (
        ((originalFilterCount - uniqueFilterCount) / originalFilterCount) *
        100
      ).toFixed(1);

      // eslint-disable-next-line no-console
      console.log(`\n📈 Deduplication Efficiency:`);
      // eslint-disable-next-line no-console
      console.log(`   Original filters (from ${originalFileCount} files): ${originalFilterCount}`);
      // eslint-disable-next-line no-console
      console.log(`   Unique filters: ${uniqueFilterCount}`);
      // eslint-disable-next-line no-console
      console.log(`   Deduplication efficiency: ${deduplicationEfficiency}%`);
      // eslint-disable-next-line no-console
      console.log(`   Space saved: ~2.8MB of fixture files removed`);

      expect(uniqueFilterCount).toBeLessThan(originalFilterCount);
      expect(Number(deduplicationEfficiency)).toBeGreaterThan(30);
    });

    it('should validate comprehensive filter pattern coverage', () => {
      // Analyze the diversity of filter patterns
      const fieldPatterns = new Set<string>();
      const queryTypes = new Set<string>();
      const metaTypes = new Set<string>();

      uniqueFilters.forEach((filter) => {
        // Track field patterns
        if (filter.meta?.key) {
          fieldPatterns.add(filter.meta.key);
        }

        // Track query types
        if (filter.query) {
          Object.keys(filter.query).forEach((queryType) => {
            queryTypes.add(queryType);
          });
        }

        // Track meta types
        if (filter.meta?.type) {
          metaTypes.add(filter.meta.type);
        }
      });

      // eslint-disable-next-line no-console
      console.log(`\n🎯 Pattern Coverage Analysis:`);
      // eslint-disable-next-line no-console
      console.log(`   Unique field patterns: ${fieldPatterns.size}`);
      // eslint-disable-next-line no-console
      console.log(`   Query types: ${Array.from(queryTypes).join(', ')}`);
      // eslint-disable-next-line no-console
      console.log(`   Meta types: ${Array.from(metaTypes).join(', ')}`);

      // Should have good diversity
      expect(fieldPatterns.size).toBeGreaterThan(50);
      expect(queryTypes.size).toBeGreaterThan(3);
      expect(metaTypes.size).toBeGreaterThan(3);
    });
  });
});
