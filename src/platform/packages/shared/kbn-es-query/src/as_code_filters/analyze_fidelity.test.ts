/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromStoredFilter } from './from_stored_filter';
import { toStoredFilter } from './to_stored_filter';
import type { Filter } from '../..';
import { uniqueBeatsFilters } from '../__fixtures__/unique_beats_filters';

/**
 * Deep analysis of round-trip fidelity
 *
 * This test analyzes EXACTLY what properties are being changed during round-trip
 * conversion to understand the 0% fidelity rate.
 */

describe('Round-Trip Fidelity Deep Analysis', () => {
  const uniqueFilters: Filter[] = uniqueBeatsFilters as unknown as Filter[];

  it('should analyze exact property changes in first 10 filters', () => {
    const results: Array<{
      filterIndex: number;
      originalType: string;
      changes: Array<{
        path: string;
        originalValue: any;
        roundTripValue: any;
      }>;
    }> = [];

    // Analyze first 10 filters in detail
    uniqueFilters.slice(0, 10).forEach((original, index) => {
      const simplified = fromStoredFilter(original);
      const roundTrip = toStoredFilter(simplified);

      const changes: Array<{
        path: string;
        originalValue: any;
        roundTripValue: any;
      }> = [];

      // Deep comparison function
      const compareObjects = (obj1: any, obj2: any, path: string = '') => {
        if (obj1 === obj2) return;

        if (typeof obj1 !== typeof obj2) {
          changes.push({
            path: path || 'root',
            originalValue: obj1,
            roundTripValue: obj2,
          });
          return;
        }

        if (typeof obj1 !== 'object' || obj1 === null) {
          if (obj1 !== obj2) {
            changes.push({
              path: path || 'root',
              originalValue: obj1,
              roundTripValue: obj2,
            });
          }
          return;
        }

        if (Array.isArray(obj1) !== Array.isArray(obj2)) {
          changes.push({
            path: path || 'root',
            originalValue: obj1,
            roundTripValue: obj2,
          });
          return;
        }

        if (Array.isArray(obj1)) {
          const maxLength = Math.max(obj1.length, obj2.length);
          for (let i = 0; i < maxLength; i++) {
            const currentPath = path ? `${path}[${i}]` : `[${i}]`;
            compareObjects(obj1[i], obj2[i], currentPath);
          }
          return;
        }

        // Compare object properties
        const allKeys = Array.from(new Set([...Object.keys(obj1), ...Object.keys(obj2)]));
        for (const key of allKeys) {
          const currentPath = path ? `${path}.${key}` : key;
          if (!(key in obj1)) {
            changes.push({
              path: currentPath,
              originalValue: undefined,
              roundTripValue: obj2[key],
            });
          } else if (!(key in obj2)) {
            changes.push({
              path: currentPath,
              originalValue: obj1[key],
              roundTripValue: undefined,
            });
          } else {
            compareObjects(obj1[key], obj2[key], currentPath);
          }
        }
      };

      compareObjects(original, roundTrip);

      if (changes.length > 0) {
        results.push({
          filterIndex: index,
          originalType: original.meta?.type || 'unknown',
          changes,
        });
      }
    });

    // Log detailed analysis
    // eslint-disable-next-line no-console
    console.log('\n🔬 DETAILED FIDELITY ANALYSIS (First 10 Filters):\n');
    // eslint-disable-next-line no-console
    console.log(`Filters with changes: ${results.length} / 10\n`);

    results.forEach((result) => {
      // eslint-disable-next-line no-console
      console.log(`\n━━━ Filter ${result.filterIndex} (type: ${result.originalType}) ━━━`);
      // eslint-disable-next-line no-console
      console.log(`Changes: ${result.changes.length}\n`);

      result.changes.forEach((change) => {
        // eslint-disable-next-line no-console
        console.log(`  ${change.path}:`);
        // eslint-disable-next-line no-console
        console.log(`    Original:  ${JSON.stringify(change.originalValue)}`);
        // eslint-disable-next-line no-console
        console.log(`    Round-trip: ${JSON.stringify(change.roundTripValue)}`);
      });
    });

    expect(true).toBe(true);
  });

  it('should categorize all property changes across all filters', () => {
    const propertyChangeCounts = new Map<string, number>();
    const propertyChangeExamples = new Map<
      string,
      Array<{
        originalValue: any;
        roundTripValue: any;
      }>
    >();

    let filtersWithChanges = 0;
    let totalFilters = 0;

    uniqueFilters.forEach((original) => {
      totalFilters++;
      const simplified = fromStoredFilter(original);
      const roundTrip = toStoredFilter(simplified);

      const changes: Array<{ path: string; originalValue: any; roundTripValue: any }> = [];

      // Deep comparison
      const compareObjects = (obj1: any, obj2: any, path: string = '') => {
        if (obj1 === obj2) return;

        if (typeof obj1 !== typeof obj2) {
          changes.push({ path: path || 'root', originalValue: obj1, roundTripValue: obj2 });
          return;
        }

        if (typeof obj1 !== 'object' || obj1 === null) {
          if (obj1 !== obj2) {
            changes.push({ path: path || 'root', originalValue: obj1, roundTripValue: obj2 });
          }
          return;
        }

        if (Array.isArray(obj1) !== Array.isArray(obj2)) {
          changes.push({ path: path || 'root', originalValue: obj1, roundTripValue: obj2 });
          return;
        }

        if (Array.isArray(obj1)) {
          const maxLength = Math.max(obj1.length, obj2.length);
          for (let i = 0; i < maxLength; i++) {
            const currentPath = path ? `${path}[${i}]` : `[${i}]`;
            compareObjects(obj1[i], obj2[i], currentPath);
          }
          return;
        }

        const allKeys = Array.from(new Set([...Object.keys(obj1), ...Object.keys(obj2)]));
        for (const key of allKeys) {
          const currentPath = path ? `${path}.${key}` : key;
          if (!(key in obj1)) {
            changes.push({
              path: currentPath,
              originalValue: undefined,
              roundTripValue: obj2[key],
            });
          } else if (!(key in obj2)) {
            changes.push({
              path: currentPath,
              originalValue: obj1[key],
              roundTripValue: undefined,
            });
          } else {
            compareObjects(obj1[key], obj2[key], currentPath);
          }
        }
      };

      compareObjects(original, roundTrip);

      if (changes.length > 0) {
        filtersWithChanges++;

        changes.forEach((change) => {
          const count = propertyChangeCounts.get(change.path) || 0;
          propertyChangeCounts.set(change.path, count + 1);

          // Store examples (limit to 3 per property)
          const examples = propertyChangeExamples.get(change.path) || [];
          if (examples.length < 3) {
            examples.push({
              originalValue: change.originalValue,
              roundTripValue: change.roundTripValue,
            });
            propertyChangeExamples.set(change.path, examples);
          }
        });
      }
    });

    const fidelityRate = (((totalFilters - filtersWithChanges) / totalFilters) * 100).toFixed(1);

    // Log categorized analysis
    // eslint-disable-next-line no-console
    console.log('\n📊 COMPREHENSIVE PROPERTY CHANGE ANALYSIS:\n');
    // eslint-disable-next-line no-console
    console.log(`Total filters analyzed: ${totalFilters}`);
    // eslint-disable-next-line no-console
    console.log(`Filters with changes: ${filtersWithChanges}`);
    // eslint-disable-next-line no-console
    console.log(`Perfect round-trips: ${totalFilters - filtersWithChanges}`);
    // eslint-disable-next-line no-console
    console.log(`Fidelity rate: ${fidelityRate}%\n`);

    // eslint-disable-next-line no-console
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // eslint-disable-next-line no-console
    console.log('TOP CHANGED PROPERTIES (sorted by frequency):\n');

    const sortedProperties = Array.from(propertyChangeCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    sortedProperties.forEach(([property, count]) => {
      const percentage = ((count / totalFilters) * 100).toFixed(1);
      // eslint-disable-next-line no-console
      console.log(`\n${property}:`);
      // eslint-disable-next-line no-console
      console.log(`  Affected filters: ${count} (${percentage}%)`);

      const examples = propertyChangeExamples.get(property) || [];
      if (examples.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`  Examples:`);
        examples.forEach((example, idx) => {
          // eslint-disable-next-line no-console
          console.log(
            `    ${idx + 1}. ${JSON.stringify(example.originalValue)} → ${JSON.stringify(
              example.roundTripValue
            )}`
          );
        });
      }
    });

    expect(true).toBe(true);
  });
});
