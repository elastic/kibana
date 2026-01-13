/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import * as babel from '@babel/core';
import type { BarrelIndex, BarrelFileEntry, ExportInfo } from '../types';

interface TestExportInfo extends ExportInfo {
  expectedPath: string;
}

interface TestBarrelFileEntry extends Omit<BarrelFileEntry, 'exports'> {
  exports: Record<string, TestExportInfo>;
  localExports?: string[];
}

interface TestBarrelIndex {
  [barrelFilePath: string]: TestBarrelFileEntry;
}

interface TransformOptions {
  code: string;
  barrelIndex?: TestBarrelIndex | null;
  filename?: string;
}

const TEST_FILE_PATH = '/test/src/file.ts';
const REAL_TEST_FILE_PATH = Path.join(process.cwd(), 'src/test-file.ts');
const COMPONENTS_BARREL_PATH = '/test/src/components/index.ts';
const RXJS_BARREL_PATH = require.resolve('rxjs');
const RXJS_PACKAGE_ROOT = Path.dirname(RXJS_BARREL_PATH);

const BARREL_INDEX: TestBarrelIndex = {
  [COMPONENTS_BARREL_PATH]: {
    exports: {
      Button: {
        path: '/test/src/components/Button/Button.tsx',
        type: 'named',
        localName: 'Button',
        importedName: 'Button',
        expectedPath: './components/Button/Button',
      },
      Modal: {
        path: '/test/src/components/Modal/Modal.tsx',
        type: 'named',
        localName: 'Modal',
        importedName: 'Modal',
        expectedPath: './components/Modal/Modal',
      },
    },
  },
  [RXJS_BARREL_PATH]: {
    packageName: 'rxjs',
    packageRoot: RXJS_PACKAGE_ROOT,
    exports: {
      Observable: {
        path: Path.join(RXJS_PACKAGE_ROOT, 'dist/cjs/internal/Observable.js'),
        type: 'named',
        localName: 'Observable',
        importedName: 'Observable',
        publicSubpath: 'internal/Observable',
        expectedPath: 'rxjs/internal/Observable',
      },
      firstValueFrom: {
        path: Path.join(RXJS_PACKAGE_ROOT, 'dist/cjs/internal/firstValueFrom.js'),
        type: 'named',
        localName: 'firstValueFrom',
        importedName: 'firstValueFrom',
        publicSubpath: 'internal/firstValueFrom',
        expectedPath: 'rxjs/internal/firstValueFrom',
      },
    },
  },
};

const COMPONENTS_BARREL = BARREL_INDEX[COMPONENTS_BARREL_PATH];
const RXJS_BARREL = BARREL_INDEX[RXJS_BARREL_PATH];

function transform(options: TransformOptions): babel.BabelFileResult | null {
  const { code, filename = TEST_FILE_PATH } = options;
  // Use hasOwnProperty to distinguish from not provided default usage and the explicit null/undefined cases
  const barrelIndex = 'barrelIndex' in options ? options.barrelIndex : BARREL_INDEX;
  return babel.transformSync(code, {
    filename,
    parserOpts: {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    },
    plugins: [[require.resolve('../plugin'), { barrelIndex }]],
    babelrc: false,
  });
}

describe('barrel transform plugin', () => {
  describe('named import transformations', () => {
    it('transforms a single named import to direct path', () => {
      const result = transform({ code: `import { Button } from './components';` });

      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Button.expectedPath);
      expect(result?.code).not.toContain(`'./components'`);
    });

    it('transforms multiple named imports to separate direct paths', () => {
      const result = transform({ code: `import { Button, Modal } from './components';` });

      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Button.expectedPath);
      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Modal.expectedPath);
    });

    it('preserves local alias when transforming', () => {
      const result = transform({ code: `import { Button as MyButton } from './components';` });

      expect(result?.code).toContain('MyButton');
      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Button.expectedPath);
    });
  });

  describe('default import transformations', () => {
    it('transforms default import to direct path', () => {
      const result = transform({ code: `import Button from './components/Button/Button';` });

      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Button.expectedPath);
    });

    it('transforms default import to named import when source has named export', () => {
      // This tests the fix for: import X from barrel → import { X } from source
      // When barrel does: import { X } from './source'; export default X;
      const HANDLEBARS_BARREL_PATH = '/test/src/handlebars/index.ts';

      const barrelWithDefaultToNamed: TestBarrelIndex = {
        [HANDLEBARS_BARREL_PATH]: {
          packageName: '@kbn/handlebars',
          packageRoot: '/test/src/handlebars',
          exports: {
            // Barrel has: import { Handlebars } from './src/handlebars'; export default Handlebars;
            // Source has: export { Handlebars }; (named export, NOT default)
            default: {
              path: '/test/src/handlebars/src/handlebars.ts',
              type: 'named', // Source has NAMED export, not default
              localName: 'Handlebars',
              importedName: 'default',
              expectedPath: '@kbn/handlebars/src/handlebars',
            },
          },
        },
      };

      const result = transform({
        code: `import Handlebars from './handlebars';`,
        barrelIndex: barrelWithDefaultToNamed,
        filename: '/test/src/file.ts',
      });

      // Should generate NAMED import { Handlebars as Handlebars }, not default import
      expect(result?.code).toContain('@kbn/handlebars/src/handlebars');
      expect(result?.code).toMatch(/import\s*{\s*Handlebars\s*(as\s+Handlebars\s*)?\}/);
      // Should NOT be a default import
      expect(result?.code).not.toMatch(/import\s+Handlebars\s+from/);
    });

    it('preserves default import when source has default export', () => {
      // Verify we didn't break the case where source DOES have a default export
      const UTILS_BARREL_PATH = '/test/src/utils/index.ts';

      const barrelWithTrueDefault: TestBarrelIndex = {
        [UTILS_BARREL_PATH]: {
          exports: {
            default: {
              path: '/test/src/utils/main.ts',
              type: 'default', // Source has actual default export
              localName: 'main',
              importedName: 'default',
              expectedPath: './utils/main',
            },
          },
        },
      };

      const result = transform({
        code: `import main from './utils';`,
        barrelIndex: barrelWithTrueDefault,
        filename: '/test/src/file.ts',
      });

      // Should remain as default import
      expect(result?.code).toContain('./utils/main');
      expect(result?.code).toMatch(/import\s+main\s+from\s+['"]\.\/utils\/main['"]/);
    });
  });

  describe('unchanged imports', () => {
    it('leaves imports from non-barrel paths unchanged', () => {
      const result = transform({ code: `import { something } from './not-a-barrel';` });

      expect(result?.code).toContain(`from './not-a-barrel'`);
    });

    it('leaves namespace imports unchanged', () => {
      const result = transform({ code: `import * as Components from './components';` });

      expect(result?.code).toContain(`from './components'`);
    });
  });

  describe('no-op behavior', () => {
    it('is a no-op when barrelIndex is null', () => {
      const result = transform({
        code: `import { Button } from './components';`,
        barrelIndex: null,
      });

      expect(result?.code).toContain(`from './components'`);
    });

    it('is a no-op when barrelIndex is undefined', () => {
      const result = transform({
        code: `import { Button } from './components';`,
        barrelIndex: undefined,
      });

      expect(result?.code).toContain(`from './components'`);
    });
  });

  describe('node_modules package transformations', () => {
    it('transforms package import to package subpath', () => {
      const result = transform({
        code: `import { Observable } from 'rxjs';`,
        filename: REAL_TEST_FILE_PATH,
      });

      expect(result?.code).toContain(RXJS_BARREL.exports.Observable.expectedPath);
      expect(result?.code).not.toMatch(/from ['"]rxjs['"]/);
    });

    it('transforms multiple package imports', () => {
      const result = transform({
        code: `import { Observable, firstValueFrom } from 'rxjs';`,
        filename: REAL_TEST_FILE_PATH,
      });

      expect(result?.code).toContain(RXJS_BARREL.exports.Observable.expectedPath);
      expect(result?.code).toContain(RXJS_BARREL.exports.firstValueFrom.expectedPath);
    });

    it('uses package subpath style, not relative node_modules path', () => {
      const result = transform({
        code: `import { Observable } from 'rxjs';`,
        filename: REAL_TEST_FILE_PATH,
      });

      expect(result?.code).toContain(RXJS_BARREL.packageName);
      expect(result?.code).not.toContain('./node_modules');
      expect(result?.code).not.toContain('../node_modules');
    });
  });

  describe('barrel index structure', () => {
    it('is serializable via JSON', () => {
      const serialized = JSON.stringify(BARREL_INDEX);
      const deserialized = JSON.parse(serialized) as BarrelIndex;

      expect(deserialized).toEqual(BARREL_INDEX);
    });

    it('preserves packageName and packageRoot through serialization', () => {
      const serialized = JSON.stringify(BARREL_INDEX);
      const deserialized = JSON.parse(serialized) as BarrelIndex;

      expect(deserialized[RXJS_BARREL_PATH].packageName).toBe(RXJS_BARREL.packageName);
      expect(deserialized[RXJS_BARREL_PATH].packageRoot).toBe(RXJS_BARREL.packageRoot);
    });
  });

  describe('exports field handling', () => {
    // Use relative imports to avoid require.resolve issues in tests
    const RESTRICTED_BARREL_PATH = '/test/src/restricted-lib/index.ts';

    it('leaves import unchanged when export is not in barrel index', () => {
      // In the new architecture, the scanner filters out exports without valid publicSubpath
      // So exports that can't be safely transformed are not in the index at all
      const emptyIndex: TestBarrelIndex = {
        [RESTRICTED_BARREL_PATH]: {
          packageName: 'restricted-lib',
          packageRoot: '/test/src/restricted-lib',
          // Empty exports - simulates scanner filtering out non-public exports
          exports: {},
        },
      };

      const result = transform({
        code: `import { helper } from './restricted-lib';`,
        barrelIndex: emptyIndex,
        filename: '/test/src/file.ts',
      });

      // Should NOT transform - import should remain unchanged
      expect(result?.code).toContain(`from './restricted-lib'`);
      expect(result?.code).not.toContain('restricted-lib/internal/helper');
    });

    it('transforms when barrel has NO packageName (uses relative path fallback)', () => {
      const indexWithoutPackageName: TestBarrelIndex = {
        [RESTRICTED_BARREL_PATH]: {
          // Internal barrel without packageName - uses relative paths
          exports: {
            helper: {
              path: '/test/src/restricted-lib/internal/helper.ts',
              type: 'named',
              localName: 'helper',
              importedName: 'helper',
              expectedPath: './restricted-lib/internal/helper',
            },
          },
        },
      };

      const result = transform({
        code: `import { helper } from './restricted-lib';`,
        barrelIndex: indexWithoutPackageName,
        filename: '/test/src/file.ts',
      });

      // Should transform using relative path (internal barrel without packageName)
      expect(result?.code).toContain('./restricted-lib/internal/helper');
    });

    it('handles exports with publicSubpath - only public exports are in index', () => {
      // In the new architecture, the scanner only includes exports with valid publicSubpath
      // So privateHelper wouldn't be in the index at all
      const publicOnlyIndex: TestBarrelIndex = {
        [RESTRICTED_BARREL_PATH]: {
          packageName: 'restricted-lib',
          packageRoot: '/test/src/restricted-lib',
          exports: {
            // Only publicHelper is in the index (scanner filtered out privateHelper)
            publicHelper: {
              path: '/test/src/restricted-lib/public/helper.ts',
              type: 'named',
              localName: 'publicHelper',
              importedName: 'publicHelper',
              publicSubpath: 'public/helper',
              expectedPath: 'restricted-lib/public/helper',
            },
          },
        },
      };

      const result = transform({
        code: `import { privateHelper, publicHelper } from './restricted-lib';`,
        barrelIndex: publicOnlyIndex,
        filename: '/test/src/file.ts',
      });

      // publicHelper should be transformed, privateHelper not found so remains unchanged
      expect(result?.code).toContain('restricted-lib/public/helper');
      expect(result?.code).toContain('./restricted-lib');
      expect(result?.code).not.toContain('restricted-lib/internal/private');
    });

    it('uses publicSubpath when available for package imports', () => {
      const result = transform({
        code: `import { Observable } from 'rxjs';`,
        filename: REAL_TEST_FILE_PATH,
      });

      // Should use the publicSubpath from the index
      expect(result?.code).toContain('rxjs/internal/Observable');
    });

    it('preserves publicSubpath through serialization', () => {
      const serialized = JSON.stringify(BARREL_INDEX);
      const deserialized = JSON.parse(serialized) as BarrelIndex;

      expect(deserialized[RXJS_BARREL_PATH].exports.Observable.publicSubpath).toBe(
        'internal/Observable'
      );
    });
  });

  describe('type-only imports', () => {
    it('leaves pure type imports unchanged', () => {
      const result = transform({ code: `import type { Button } from './components';` });

      expect(result?.code).toContain(`import type { Button } from './components'`);
      // Should NOT transform to direct path
      expect(result?.code).not.toContain(COMPONENTS_BARREL.exports.Button.expectedPath);
    });

    it('only rewrites value specifiers when mixed with type specifiers', () => {
      const result = transform({
        code: `import { type Button, Modal } from './components';`,
      });

      // Type specifier should remain unchanged with original source
      expect(result?.code).toContain(`type Button`);
      expect(result?.code).toMatch(/['"]\.\/components['"]/);
      // Value specifier should be transformed
      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Modal.expectedPath);
    });

    it('preserves importKind on fallback declaration', () => {
      const result = transform({
        code: `import { type Button, Modal } from './components';`,
      });

      // Modal should be transformed, type Button should remain
      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Modal.expectedPath);
      // The fallback should contain type Button and the original source
      expect(result?.code).toMatch(
        /import\s*{\s*type\s+Button\s*}\s*from\s*['"]\.\/components['"]/
      );
    });
  });

  describe('locally-defined default exports (no infinite recursion)', () => {
    // When a barrel has a locally-defined default export (e.g., export default function() {}),
    // it is NOT included in the barrel index. This test verifies that importing such a default
    // leaves the import unchanged and doesn't cause infinite recursion.
    const CASES_CONTEXT_BARREL_PATH = '/test/src/cases_context/index.ts';

    it('leaves default imports unchanged when default is not in barrel index', () => {
      // Barrel has only named exports - no 'default' because it's locally defined
      // This is what the scanner produces for: export { namedExport } from './source'; export default function() {}
      const barrelWithLocalDefault: TestBarrelIndex = {
        [CASES_CONTEXT_BARREL_PATH]: {
          exports: {
            namedExport: {
              path: '/test/src/cases_context/source.ts',
              type: 'named',
              localName: 'namedExport',
              importedName: 'namedExport',
              expectedPath: './cases_context/source',
            },
          },
        },
      };

      const result = transform({
        code: `import CasesProvider from './cases_context';`,
        barrelIndex: barrelWithLocalDefault,
        filename: '/test/src/app.ts',
      });

      // Should be unchanged - default not in barrel index, no infinite recursion
      expect(result?.code).toMatch(/from ['"]\.\/cases_context['"]/);
      expect(result?.code).toContain('CasesProvider');
    });

    it('transforms named imports while leaving default import from same barrel unchanged', () => {
      const barrelWithLocalDefault: TestBarrelIndex = {
        [CASES_CONTEXT_BARREL_PATH]: {
          exports: {
            namedExport: {
              path: '/test/src/cases_context/source.ts',
              type: 'named',
              localName: 'namedExport',
              importedName: 'namedExport',
              expectedPath: './cases_context/source',
            },
          },
        },
      };

      const result = transform({
        code: `import CasesProvider, { namedExport } from './cases_context';`,
        barrelIndex: barrelWithLocalDefault,
        filename: '/test/src/app.ts',
      });

      // Named import should be transformed
      expect(result?.code).toContain('./cases_context/source');
      // Default import should remain pointing to barrel (not transformed)
      expect(result?.code).toMatch(/from ['"]\.\/cases_context['"]/);
    });
  });

  describe('internal package transformations with packageName', () => {
    // Simulates @kbn/* packages which have packageName set in the barrel index
    // When packageName is present, transforms should use package paths, not relative
    const KBN_PACKAGE_BARREL_PATH = '/test/src/kbn-workflows/index.ts';
    const KBN_PACKAGE_ROOT = '/test/src/kbn-workflows';

    const packageWithNameIndex: TestBarrelIndex = {
      [KBN_PACKAGE_BARREL_PATH]: {
        packageName: '@kbn/workflows',
        packageRoot: KBN_PACKAGE_ROOT,
        exports: {
          WorkflowRepository: {
            path: `${KBN_PACKAGE_ROOT}/server/repositories/workflow_repository.ts`,
            type: 'named',
            localName: 'WorkflowRepository',
            importedName: 'WorkflowRepository',
            expectedPath: '@kbn/workflows/server/repositories/workflow_repository',
          },
          ExecutionStatus: {
            path: `${KBN_PACKAGE_ROOT}/common/constants.ts`,
            type: 'named',
            localName: 'ExecutionStatus',
            importedName: 'ExecutionStatus',
            expectedPath: '@kbn/workflows/common/constants',
          },
        },
      },
    };

    it('uses packageName for import path when available (not relative path)', () => {
      // Using relative import that resolves to the barrel path
      const result = transform({
        code: `import { WorkflowRepository } from './kbn-workflows';`,
        barrelIndex: packageWithNameIndex,
        filename: '/test/src/file.ts',
      });

      // Should generate package path because packageName is set
      expect(result?.code).toContain('@kbn/workflows/server/repositories/workflow_repository');
      // Should NOT generate relative path like '../kbn-workflows/server/...'
      expect(result?.code).not.toContain('./kbn-workflows/server');
      expect(result?.code).not.toContain('../');
    });

    it('uses packageName for multiple imports', () => {
      const result = transform({
        code: `import { WorkflowRepository, ExecutionStatus } from './kbn-workflows';`,
        barrelIndex: packageWithNameIndex,
        filename: '/test/src/file.ts',
      });

      expect(result?.code).toContain('@kbn/workflows/server/repositories/workflow_repository');
      expect(result?.code).toContain('@kbn/workflows/common/constants');
    });
  });

  describe('import order with mixed transformable and non-transformable imports', () => {
    // When an import has both transformable exports (re-exports from submodules) and
    // non-transformable exports (local declarations in the barrel), the barrel import
    // must come FIRST to ensure the barrel is fully loaded before any submodules
    // that may depend on it (circular dependency safety).
    const MIXED_BARREL_PATH = '/test/src/config-schema/index.ts';
    const MIXED_BARREL_ROOT = '/test/src/config-schema';

    const mixedBarrelIndex: TestBarrelIndex = {
      [MIXED_BARREL_PATH]: {
        packageName: '@kbn/config-schema',
        packageRoot: MIXED_BARREL_ROOT,
        exports: {
          // offeringBasedSchema is a re-export from a submodule and CAN be transformed
          offeringBasedSchema: {
            path: `${MIXED_BARREL_ROOT}/src/helpers/offering_based_schema.ts`,
            type: 'named',
            localName: 'offeringBasedSchema',
            importedName: 'offeringBasedSchema',
            expectedPath: '@kbn/config-schema/src/helpers/offering_based_schema',
          },
          // 'schema' is NOT in the barrel index because it's a local export const,
          // not a re-export from a submodule. This simulates real scanner behavior.
        },
      },
    };

    it('emits barrel import BEFORE direct imports for circular dependency safety', () => {
      const result = transform({
        code: `import { schema, offeringBasedSchema } from './config-schema';`,
        barrelIndex: mixedBarrelIndex,
        filename: '/test/src/file.ts',
      });

      // Both imports should be present
      expect(result?.code).toContain('@kbn/config-schema/src/helpers/offering_based_schema');
      expect(result?.code).toMatch(/['"]\.\/config-schema['"]/);

      // Critical: barrel import must come BEFORE direct import
      // This ensures the barrel is fully loaded before submodules that depend on it
      const barrelImportMatch = result?.code?.match(/['"]\.\/config-schema['"]/);
      const barrelImportPos = barrelImportMatch?.index ?? -1;
      const directImportPos =
        result?.code?.indexOf('@kbn/config-schema/src/helpers/offering_based_schema') ?? -1;

      expect(barrelImportPos).toBeGreaterThan(-1);
      expect(directImportPos).toBeGreaterThan(-1);
      expect(barrelImportPos).toBeLessThan(directImportPos);
    });

    it('preserves correct specifiers in each import declaration', () => {
      const result = transform({
        code: `import { schema, offeringBasedSchema } from './config-schema';`,
        barrelIndex: mixedBarrelIndex,
        filename: '/test/src/file.ts',
      });

      // 'schema' should remain in the barrel import (not found in index)
      expect(result?.code).toMatch(/import\s*{\s*schema\s*}\s*from\s*['"]\.\/config-schema['"]/);
      // 'offeringBasedSchema' should be in the direct import
      expect(result?.code).toMatch(
        /import\s*{\s*offeringBasedSchema\s*}\s*from\s*['"]@kbn\/config-schema\/src\/helpers\/offering_based_schema['"]/
      );
    });
  });

  describe('named export re-export transformations', () => {
    it('transforms a single named re-export to direct path', () => {
      const result = transform({ code: `export { Button } from './components';` });

      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Button.expectedPath);
      // Barrel path should be replaced with direct path
      expect(result?.code).not.toMatch(/['"]\.\/components['"]/);
      expect(result?.code).toContain('export {');
    });

    it('transforms multiple named re-exports to separate direct paths', () => {
      const result = transform({ code: `export { Button, Modal } from './components';` });

      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Button.expectedPath);
      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Modal.expectedPath);
    });

    it('preserves export alias when transforming', () => {
      const result = transform({ code: `export { Button as MyButton } from './components';` });

      expect(result?.code).toContain('MyButton');
      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Button.expectedPath);
    });

    it('keeps unresolvable exports in original barrel', () => {
      const result = transform({ code: `export { Button, Unknown } from './components';` });

      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Button.expectedPath);
      // Barrel path can use single or double quotes depending on Babel output
      expect(result?.code).toMatch(/['"]\.\/components['"]/);
      expect(result?.code).toContain('Unknown');
    });

    it('skips type-only re-exports', () => {
      const result = transform({ code: `export type { Button } from './components';` });

      // Type-only exports should not be transformed, so barrel path remains
      expect(result?.code).toMatch(/['"]\.\/components['"]/);
      expect(result?.code).not.toContain(COMPONENTS_BARREL.exports.Button.expectedPath);
    });

    it('emits barrel export BEFORE direct exports for circular dependency safety', () => {
      const result = transform({ code: `export { Button, Unknown } from './components';` });

      // Barrel export (with Unknown) should come before direct export
      const barrelExportMatch = result?.code?.match(/['"]\.\/components['"]/);
      const barrelExportPos = barrelExportMatch?.index ?? -1;
      const directExportPos =
        result?.code?.indexOf(COMPONENTS_BARREL.exports.Button.expectedPath) ?? -1;

      expect(barrelExportPos).toBeGreaterThan(-1);
      expect(directExportPos).toBeGreaterThan(-1);
      expect(barrelExportPos).toBeLessThan(directExportPos);
    });
  });

  describe('star export transformations', () => {
    it('transforms export * to individual named exports', () => {
      const result = transform({ code: `export * from './components';` });

      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Button.expectedPath);
      expect(result?.code).toContain(COMPONENTS_BARREL.exports.Modal.expectedPath);
      // Barrel path should be replaced with direct paths
      expect(result?.code).not.toMatch(/['"]\.\/components['"]/);
      expect(result?.code).not.toContain('export *');
    });

    it('does not re-export default from star export', () => {
      const BARREL_WITH_DEFAULT_PATH = '/test/src/barrel-with-default/index.ts';
      const barrelWithDefault: TestBarrelIndex = {
        [BARREL_WITH_DEFAULT_PATH]: {
          exports: {
            Button: {
              path: '/test/src/barrel-with-default/Button.ts',
              type: 'named',
              localName: 'Button',
              importedName: 'Button',
              expectedPath: './barrel-with-default/Button',
            },
            default: {
              path: '/test/src/barrel-with-default/Default.ts',
              type: 'default',
              localName: 'Default',
              importedName: 'default',
              expectedPath: './barrel-with-default/Default',
            },
          },
        },
      };

      const result = transform({
        code: `export * from './barrel-with-default';`,
        barrelIndex: barrelWithDefault,
      });

      expect(result?.code).toContain('Button');
      // default should not be re-exported via export *
      expect(result?.code).not.toMatch(/export\s*{\s*default/);
    });

    it('leaves export * unchanged when barrel not in index', () => {
      const result = transform({
        code: `export * from './unknown-barrel';`,
      });

      expect(result?.code).toContain(`export * from './unknown-barrel'`);
    });

    describe('local export shadowing', () => {
      // Per ECMAScript spec, local exports shadow export * re-exports.
      // The plugin must respect this to avoid duplicate export declarations.
      // Uses the same COMPONENTS_BARREL_PATH as other tests to ensure proper path resolution
      const TASK_STATE_V1_PATH = '/test/src/task_state/v1/index.ts';

      it('excludes locally-shadowed const exports from export * transformation', () => {
        const shadowingBarrelIndex: TestBarrelIndex = {
          [TASK_STATE_V1_PATH]: {
            exports: {
              versionSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'versionSchema',
                importedName: 'versionSchema',
                expectedPath: '../v1/schema',
              },
              throttledActionSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'throttledActionSchema',
                importedName: 'throttledActionSchema',
                expectedPath: '../v1/schema',
              },
              metaSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'metaSchema',
                importedName: 'metaSchema',
                expectedPath: '../v1/schema',
              },
            },
          },
        };

        const result = transform({
          code: `
            export * from '../v1';
            export const versionSchema = {};
          `,
          barrelIndex: shadowingBarrelIndex,
          filename: '/test/src/task_state/v2/schema.ts',
        });

        // Non-shadowed exports should be transformed
        expect(result?.code).toContain('throttledActionSchema');
        expect(result?.code).toContain('metaSchema');
        // Shadowed export should NOT be in the transformed export *
        expect(result?.code).not.toMatch(/export\s*{[^}]*versionSchema[^}]*}\s*from/);
        // Local definition should remain
        expect(result?.code).toMatch(/export const versionSchema/);
      });

      it('excludes locally-shadowed function exports from export * transformation', () => {
        const shadowingBarrelIndex: TestBarrelIndex = {
          [TASK_STATE_V1_PATH]: {
            exports: {
              versionSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'versionSchema',
                importedName: 'versionSchema',
                expectedPath: '../v1/schema',
              },
              throttledActionSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'throttledActionSchema',
                importedName: 'throttledActionSchema',
                expectedPath: '../v1/schema',
              },
            },
          },
        };

        const result = transform({
          code: `
            export * from '../v1';
            export function versionSchema() {}
          `,
          barrelIndex: shadowingBarrelIndex,
          filename: '/test/src/task_state/v2/schema.ts',
        });

        expect(result?.code).toContain('throttledActionSchema');
        expect(result?.code).not.toMatch(/export\s*{[^}]*versionSchema[^}]*}\s*from/);
        expect(result?.code).toMatch(/export function versionSchema/);
      });

      it('excludes locally-shadowed class exports from export * transformation', () => {
        const shadowingBarrelIndex: TestBarrelIndex = {
          [TASK_STATE_V1_PATH]: {
            exports: {
              versionSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'versionSchema',
                importedName: 'versionSchema',
                expectedPath: '../v1/schema',
              },
              throttledActionSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'throttledActionSchema',
                importedName: 'throttledActionSchema',
                expectedPath: '../v1/schema',
              },
            },
          },
        };

        const result = transform({
          code: `
            export * from '../v1';
            export class versionSchema {}
          `,
          barrelIndex: shadowingBarrelIndex,
          filename: '/test/src/task_state/v2/schema.ts',
        });

        expect(result?.code).toContain('throttledActionSchema');
        expect(result?.code).not.toMatch(/export\s*{[^}]*versionSchema[^}]*}\s*from/);
        expect(result?.code).toMatch(/export class versionSchema/);
      });

      it('excludes locally-shadowed specifier exports from export * transformation', () => {
        // export { X } without source re-exports a local variable
        const shadowingBarrelIndex: TestBarrelIndex = {
          [TASK_STATE_V1_PATH]: {
            exports: {
              versionSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'versionSchema',
                importedName: 'versionSchema',
                expectedPath: '../v1/schema',
              },
              throttledActionSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'throttledActionSchema',
                importedName: 'throttledActionSchema',
                expectedPath: '../v1/schema',
              },
            },
          },
        };

        const result = transform({
          code: `
            const versionSchema = {};
            export * from '../v1';
            export { versionSchema };
          `,
          barrelIndex: shadowingBarrelIndex,
          filename: '/test/src/task_state/v2/schema.ts',
        });

        expect(result?.code).toContain('throttledActionSchema');
        expect(result?.code).not.toMatch(
          /export\s*{[^}]*versionSchema[^}]*}\s*from\s*['"]\.\.\/v1/
        );
        expect(result?.code).toMatch(/export\s*{\s*versionSchema\s*}/);
      });

      it('handles multiple shadowed exports correctly', () => {
        const shadowingBarrelIndex: TestBarrelIndex = {
          [TASK_STATE_V1_PATH]: {
            exports: {
              versionSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'versionSchema',
                importedName: 'versionSchema',
                expectedPath: '../v1/schema',
              },
              throttledActionSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'throttledActionSchema',
                importedName: 'throttledActionSchema',
                expectedPath: '../v1/schema',
              },
              metaSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'metaSchema',
                importedName: 'metaSchema',
                expectedPath: '../v1/schema',
              },
            },
          },
        };

        const result = transform({
          code: `
            export * from '../v1';
            export const versionSchema = {};
            export const throttledActionSchema = {};
          `,
          barrelIndex: shadowingBarrelIndex,
          filename: '/test/src/task_state/v2/schema.ts',
        });

        // Only metaSchema should be re-exported from v1
        expect(result?.code).toContain('metaSchema');
        expect(result?.code).toContain('../v1/schema');
        // Both shadowed exports should be local only
        expect(result?.code).toMatch(/export const versionSchema/);
        expect(result?.code).toMatch(/export const throttledActionSchema/);
        // Neither should appear in the re-export
        expect(result?.code).not.toMatch(
          /export\s*{[^}]*(versionSchema|throttledActionSchema)[^}]*}\s*from/
        );
      });

      it('removes export * entirely when all exports are shadowed', () => {
        const singleExportBarrel: TestBarrelIndex = {
          [TASK_STATE_V1_PATH]: {
            exports: {
              versionSchema: {
                path: '/test/src/task_state/v1/schema.ts',
                type: 'named',
                localName: 'versionSchema',
                importedName: 'versionSchema',
                expectedPath: '../v1/schema',
              },
            },
          },
        };

        const result = transform({
          code: `
            export * from '../v1';
            export const versionSchema = {};
          `,
          barrelIndex: singleExportBarrel,
          filename: '/test/src/task_state/v2/schema.ts',
        });

        // No re-export should remain since all exports are shadowed
        expect(result?.code).not.toMatch(/from\s*['"]\.\.\/v1/);
        // Local definition should remain
        expect(result?.code).toMatch(/export const versionSchema/);
      });
    });
  });

  describe('export * with local exports', () => {
    const MIXED_BARREL_PATH = '/test/src/mixed/index.ts';

    const mixedBarrelIndex: TestBarrelIndex = {
      [MIXED_BARREL_PATH]: {
        exports: {
          // Re-export from submodule
          Foo: {
            path: '/test/src/mixed/foo.ts',
            type: 'named',
            localName: 'Foo',
            importedName: 'Foo',
            expectedPath: './mixed/foo',
          },
        },
        // Local exports defined in the barrel itself
        localExports: ['BAR', 'BAZ'],
      },
    };

    it('transforms export * to include both re-exports and local exports', () => {
      const result = transform({
        code: `export * from './mixed';`,
        barrelIndex: mixedBarrelIndex,
        filename: '/test/src/file.ts',
      });

      // Re-export should be transformed to direct path
      expect(result?.code).toContain('./mixed/foo');
      expect(result?.code).toContain('Foo');

      // Local exports should point to original barrel
      expect(result?.code).toMatch(/export\s*{\s*BAR,\s*BAZ\s*}\s*from\s*['"]\.\/mixed['"]/);

      // Original export * should be gone
      expect(result?.code).not.toContain('export *');
    });

    it('respects local shadowing for barrel local exports', () => {
      const result = transform({
        code: `
          export * from './mixed';
          export const BAR = 'shadowed';
        `,
        barrelIndex: mixedBarrelIndex,
        filename: '/test/src/file.ts',
      });

      // BAR is shadowed locally, so only BAZ should be re-exported from barrel
      expect(result?.code).toMatch(/export\s*{\s*BAZ\s*}\s*from\s*['"]\.\/mixed['"]/);
      expect(result?.code).not.toMatch(/export\s*{[^}]*BAR[^}]*}\s*from\s*['"]\.\/mixed['"]/);
      // Local definition should remain
      expect(result?.code).toMatch(/export const BAR/);
    });

    it('handles barrel with only local exports (no re-exports)', () => {
      const localOnlyBarrel: TestBarrelIndex = {
        [MIXED_BARREL_PATH]: {
          exports: {}, // No re-exports
          localExports: ['A', 'B'],
        },
      };

      const result = transform({
        code: `export * from './mixed';`,
        barrelIndex: localOnlyBarrel,
        filename: '/test/src/file.ts',
      });

      // Should emit explicit exports for local items
      expect(result?.code).toMatch(/export\s*{\s*A,\s*B\s*}\s*from\s*['"]\.\/mixed['"]/);
      expect(result?.code).not.toContain('export *');
    });

    it('does not emit local exports that are shadowed by default', () => {
      const barrelWithDefaultLocal: TestBarrelIndex = {
        [MIXED_BARREL_PATH]: {
          exports: {},
          localExports: ['default', 'A'],
        },
      };

      const result = transform({
        code: `export * from './mixed';`,
        barrelIndex: barrelWithDefaultLocal,
        filename: '/test/src/file.ts',
      });

      // 'default' should be skipped (export * doesn't re-export default)
      expect(result?.code).not.toMatch(/default/);
      // 'A' should be exported
      expect(result?.code).toMatch(/export\s*{\s*A\s*}\s*from\s*['"]\.\/mixed['"]/);
    });

    it('removes export * entirely when all re-exports AND local exports are shadowed', () => {
      const result = transform({
        code: `
          export * from './mixed';
          export const Foo = 'shadowed';
          export const BAR = 'shadowed';
          export const BAZ = 'shadowed';
        `,
        barrelIndex: mixedBarrelIndex,
        filename: '/test/src/file.ts',
      });

      // No re-export should remain since all exports are shadowed
      expect(result?.code).not.toMatch(/from\s*['"]\.\/mixed['"]/);
      // Local definitions should remain
      expect(result?.code).toMatch(/export const Foo/);
      expect(result?.code).toMatch(/export const BAR/);
      expect(result?.code).toMatch(/export const BAZ/);
    });
  });

  describe('enum export transformations', () => {
    const ENUM_BARREL_PATH = '/test/src/enums/index.ts';

    const enumBarrelIndex: TestBarrelIndex = {
      [ENUM_BARREL_PATH]: {
        exports: {
          Status: {
            path: '/test/src/enums/types.ts',
            type: 'named',
            localName: 'Status',
            importedName: 'Status',
            expectedPath: './enums/types',
          },
          Priority: {
            path: '/test/src/enums/types.ts',
            type: 'named',
            localName: 'Priority',
            importedName: 'Priority',
            expectedPath: './enums/types',
          },
        },
      },
    };

    it('transforms enum imports to direct paths', () => {
      const result = transform({
        code: `import { Status } from './enums';`,
        barrelIndex: enumBarrelIndex,
      });

      expect(result?.code).toContain('./enums/types');
      expect(result?.code).toContain('Status');
      expect(result?.code).not.toMatch(/['"]\.\/enums['"]/);
    });

    it('transforms multiple enum imports from same source', () => {
      const result = transform({
        code: `import { Status, Priority } from './enums';`,
        barrelIndex: enumBarrelIndex,
      });

      expect(result?.code).toContain('./enums/types');
      expect(result?.code).toContain('Status');
      expect(result?.code).toContain('Priority');
    });

    it('transforms export * to include enum exports', () => {
      const result = transform({
        code: `export * from './enums';`,
        barrelIndex: enumBarrelIndex,
      });

      expect(result?.code).toContain('./enums/types');
      expect(result?.code).toContain('Status');
      expect(result?.code).toContain('Priority');
      expect(result?.code).not.toContain('export *');
    });

    it('transforms named enum re-export', () => {
      const result = transform({
        code: `export { Status } from './enums';`,
        barrelIndex: enumBarrelIndex,
      });

      expect(result?.code).toContain('./enums/types');
      expect(result?.code).toContain('Status');
    });
  });

  describe('external package re-exports via export *', () => {
    // This tests the fix for exports that originate from external packages.
    // When a barrel file does: export { Direction } from '@kbn/timelines-plugin/common'
    // The scanner cannot resolve the external path, but records it with path=filePath.
    // These become localExports in the barrel index (path equals barrel path).
    // When a parent barrel does export * from './common', the transformer emits
    // explicit exports for the localExports, preserving them in the output.
    const SEARCH_STRATEGY_COMMON_PATH = '/test/src/search_strategy/common/index.ts';
    const SEARCH_STRATEGY_PATH = '/test/src/search_strategy/index.ts';

    const externalReexportBarrelIndex: TestBarrelIndex = {
      // The inner barrel that re-exports from an external package
      // Since external re-exports have path=filePath, they appear in localExports, not exports
      [SEARCH_STRATEGY_COMMON_PATH]: {
        exports: {},
        // External re-exports are captured as local exports (path points to barrel itself)
        localExports: ['Direction', 'SortField', 'Maybe'],
      },
      // The outer barrel that has export * from './common'
      // The scanner's parseAllFileExports sees the external re-exports and captures them
      // with path pointing to the common barrel
      [SEARCH_STRATEGY_PATH]: {
        exports: {
          // When export * from './common' is evaluated by scanner, Direction is captured
          // with path pointing to the common barrel (where the external re-export lives)
          Direction: {
            path: SEARCH_STRATEGY_COMMON_PATH,
            type: 'named',
            localName: 'Direction',
            importedName: 'Direction',
            expectedPath: './search_strategy/common',
          },
          SortField: {
            path: SEARCH_STRATEGY_COMMON_PATH,
            type: 'named',
            localName: 'SortField',
            importedName: 'SortField',
            expectedPath: './search_strategy/common',
          },
          Maybe: {
            path: SEARCH_STRATEGY_COMMON_PATH,
            type: 'named',
            localName: 'Maybe',
            importedName: 'Maybe',
            expectedPath: './search_strategy/common',
          },
        },
      },
    };

    it('transforms export * to include external re-exports from nested barrel', () => {
      const result = transform({
        code: `export * from './search_strategy';`,
        barrelIndex: externalReexportBarrelIndex,
        filename: '/test/src/file.ts',
      });

      // Direction (external re-export) should be included in the transformation
      expect(result?.code).toContain('Direction');
      expect(result?.code).toContain('./search_strategy/common');
      // SortField should also be included
      expect(result?.code).toContain('SortField');
      // Maybe (local type) should also be included
      expect(result?.code).toContain('Maybe');
      // Original export * should be replaced
      expect(result?.code).not.toContain('export *');
    });

    it('transforms named import of external re-export', () => {
      const result = transform({
        code: `import { Direction } from './search_strategy';`,
        barrelIndex: externalReexportBarrelIndex,
        filename: '/test/src/file.ts',
      });

      // Should be transformed to direct path to the common barrel
      expect(result?.code).toContain('./search_strategy/common');
      expect(result?.code).toContain('Direction');
      expect(result?.code).not.toMatch(/['"]\.\/search_strategy['"]/);
    });

    it('transforms multiple imports including external re-exports', () => {
      const result = transform({
        code: `import { Direction, SortField, Maybe } from './search_strategy';`,
        barrelIndex: externalReexportBarrelIndex,
        filename: '/test/src/file.ts',
      });

      // All three should be transformed to point to common barrel
      expect(result?.code).toContain('Direction');
      expect(result?.code).toContain('SortField');
      expect(result?.code).toContain('Maybe');
      expect(result?.code).toContain('./search_strategy/common');
    });

    it('transforms named re-export of external package export', () => {
      const result = transform({
        code: `export { Direction } from './search_strategy';`,
        barrelIndex: externalReexportBarrelIndex,
        filename: '/test/src/file.ts',
      });

      expect(result?.code).toContain('Direction');
      expect(result?.code).toContain('./search_strategy/common');
      expect(result?.code).not.toMatch(/['"]\.\/search_strategy['"]/);
    });
  });
});
