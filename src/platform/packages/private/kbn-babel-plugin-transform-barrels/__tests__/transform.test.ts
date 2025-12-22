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

    it('transforms when package has NO exports field (uses file path fallback)', () => {
      const indexWithoutExportsField: TestBarrelIndex = {
        [RESTRICTED_BARREL_PATH]: {
          // No packageName/packageRoot - Kibana internal barrel (no exports field)
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
        barrelIndex: indexWithoutExportsField,
        filename: '/test/src/file.ts',
      });

      // Should transform using file path fallback
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
});
