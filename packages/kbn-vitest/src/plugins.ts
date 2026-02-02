/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import type { Plugin } from 'vite';

/**
 * Vite plugin to handle .text files as raw text imports.
 * Used for grok patterns and similar text-based configuration files.
 *
 * @example
 * ```ts
 * import { rawTextPlugin } from '@kbn/vitest';
 *
 * export default defineConfig({
 *   plugins: [rawTextPlugin()],
 * });
 * ```
 */
export function rawTextPlugin(): Plugin {
  return {
    name: 'kbn-raw-text',
    enforce: 'pre',
    load(id) {
      if (id.endsWith('.text')) {
        const content = readFileSync(id, 'utf-8');
        return `export default ${JSON.stringify(content)};`;
      }
      return null;
    },
  };
}

/**
 * Vite plugin that transforms Jest syntax to Vitest syntax.
 * This allows existing Jest tests to work with Vitest without modification.
 *
 * Transforms:
 * - jest.mock() → vi.mock()
 * - jest.fn() → vi.fn()
 * - jest.spyOn() → vi.spyOn()
 * - jest.clearAllMocks() → vi.clearAllMocks()
 * - jest.resetAllMocks() → vi.resetAllMocks()
 * - jest.restoreAllMocks() → vi.restoreAllMocks()
 * - jest.useFakeTimers() → vi.useFakeTimers()
 * - jest.useRealTimers() → vi.useRealTimers()
 * - jest.requireActual() → await vi.importActual() (with async factory)
 * - jest.requireMock() → module import
 * - jest.doMock() → vi.doMock()
 * - jest.unmock() → vi.unmock()
 * - Mock factories returning functions → wrapped in { default: ... }
 *
 * @example
 * ```ts
 * import { jestCompatPlugin } from '@kbn/vitest';
 *
 * export default defineConfig({
 *   plugins: [jestCompatPlugin()],
 * });
 * ```
 */
export function jestCompatPlugin(): Plugin {
  return {
    name: 'kbn-jest-compat',
    enforce: 'pre',
    transform(code, id) {
      // Only transform test files
      if (!id.includes('.test.') && !id.includes('.spec.')) {
        return null;
      }

      // Skip node_modules
      if (id.includes('node_modules')) {
        return null;
      }

      let transformed = code;
      let hasChanges = false;

      // Transform jest.requireMock() calls
      // This adds imports for the mocked modules and replaces the calls
      const requireMockRegex = /jest\.requireMock\(\s*['"]([^'"]+)['"]\s*\)/g;
      const requireMockMatches = [...code.matchAll(requireMockRegex)];
      if (requireMockMatches.length > 0) {
        const imports: string[] = [];
        let counter = 0;

        for (const match of requireMockMatches) {
          const modulePath = match[1];
          const varName = `__mocked_module_${counter++}__`;
          imports.push(`import * as ${varName} from '${modulePath}';`);
          transformed = transformed.replace(match[0], varName);
        }

        // Add imports after the last import statement
        const lastImportIndex = transformed.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
          const endOfImport = transformed.indexOf('\n', transformed.indexOf(';', lastImportIndex));
          transformed =
            transformed.slice(0, endOfImport + 1) +
            imports.join('\n') +
            '\n' +
            transformed.slice(endOfImport + 1);
        }
        hasChanges = true;
      }

      // Transform jest.mock() to vi.mock() - this is critical for hoisting
      if (transformed.includes('jest.mock(')) {
        transformed = transformed.replace(/\bjest\.mock\(/g, 'vi.mock(');
        hasChanges = true;
      }

      // Transform mock factories that return a function directly to wrap in { default: ... }
      // This handles modules with default exports like react-use/lib/useUpdateEffect
      // We use a function to handle complex nested structures
      if (
        transformed.includes('vi.mock(') &&
        /vi\.mock\([^,]+,\s*\(\)\s*=>\s*\{\s*return\s+\(/.test(transformed)
      ) {
        // Find vi.mock calls where factory returns a function directly
        transformed = transformed.replace(
          /vi\.mock\((['"][^'"]+['"]),\s*\(\)\s*=>\s*\{\s*return\s+([\s\S]*?);\s*\}\)/g,
          (match, modulePath, returnedValue) => {
            // Check if returned value starts with ( and contains =>
            // This indicates an arrow function being returned
            if (returnedValue.trim().startsWith('(') && returnedValue.includes('=>')) {
              return `vi.mock(${modulePath}, () => ({ default: ${returnedValue} }))`;
            }
            return match;
          }
        );
        hasChanges = true;
      }

      // Transform jest.fn() to vi.fn()
      if (transformed.includes('jest.fn(')) {
        transformed = transformed.replace(/\bjest\.fn\(/g, 'vi.fn(');
        hasChanges = true;
      }

      // Transform jest.spyOn() to vi.spyOn()
      if (transformed.includes('jest.spyOn(')) {
        transformed = transformed.replace(/\bjest\.spyOn\(/g, 'vi.spyOn(');
        hasChanges = true;
      }

      // Transform jest.clearAllMocks() to vi.clearAllMocks()
      if (transformed.includes('jest.clearAllMocks(')) {
        transformed = transformed.replace(/\bjest\.clearAllMocks\(/g, 'vi.clearAllMocks(');
        hasChanges = true;
      }

      // Transform jest.resetAllMocks() to vi.resetAllMocks()
      if (transformed.includes('jest.resetAllMocks(')) {
        transformed = transformed.replace(/\bjest\.resetAllMocks\(/g, 'vi.resetAllMocks(');
        hasChanges = true;
      }

      // Transform jest.restoreAllMocks() to vi.restoreAllMocks()
      if (transformed.includes('jest.restoreAllMocks(')) {
        transformed = transformed.replace(/\bjest\.restoreAllMocks\(/g, 'vi.restoreAllMocks(');
        hasChanges = true;
      }

      // Transform jest.useFakeTimers() to vi.useFakeTimers()
      if (transformed.includes('jest.useFakeTimers(')) {
        transformed = transformed.replace(/\bjest\.useFakeTimers\(/g, 'vi.useFakeTimers(');
        hasChanges = true;
      }

      // Transform jest.useRealTimers() to vi.useRealTimers()
      if (transformed.includes('jest.useRealTimers(')) {
        transformed = transformed.replace(/\bjest\.useRealTimers\(/g, 'vi.useRealTimers(');
        hasChanges = true;
      }

      // Transform jest.requireActual() to await vi.importActual()
      // Also make the mock factory async if it contains requireActual
      if (transformed.includes('jest.requireActual(')) {
        // Make vi.mock/jest.mock factory functions async
        // Handle both `() => {` and `() => ({` patterns
        transformed = transformed.replace(
          /(vi\.mock|jest\.mock)\(([^,]+),\s*\(\)\s*=>\s*(\{|\()/g,
          (match, mockFn, modulePath, brace) => `${mockFn}(${modulePath}, async () => ${brace}`
        );
        // Then transform requireActual to await importActual
        transformed = transformed.replace(/\bjest\.requireActual\(/g, 'await vi.importActual(');
        hasChanges = true;
      }

      // Transform jest.doMock() to vi.doMock()
      if (transformed.includes('jest.doMock(')) {
        transformed = transformed.replace(/\bjest\.doMock\(/g, 'vi.doMock(');
        hasChanges = true;
      }

      // Transform jest.unmock() to vi.unmock()
      if (transformed.includes('jest.unmock(')) {
        transformed = transformed.replace(/\bjest\.unmock\(/g, 'vi.unmock(');
        hasChanges = true;
      }

      // Note: jest.MockedFunction and jest.Mocked types are handled by the globals setup
      // which defines globalThis.jest = vi, making the types compatible at runtime

      if (hasChanges) {
        return {
          code: transformed,
          map: null,
        };
      }

      return null;
    },
  };
}
