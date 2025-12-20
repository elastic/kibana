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
import type { BarrelIndex, BarrelFileEntry } from '../types';

const TEST_FILE_PATH = '/test/src/file.ts';
const TEST_FILE_DIR = Path.dirname(TEST_FILE_PATH);
const REAL_TEST_FILE_PATH = Path.join(process.cwd(), 'src/test-file.ts');
const COMPONENTS_BARREL_PATH = '/test/src/components/index.ts';
const UTILS_BARREL_PATH = '/test/src/utils/index.ts';
const APP_BARREL_PATH = '/test/src/app/index.ts';
const PARTIAL_BARREL_PATH = '/test/src/partial/index.ts';
const RXJS_BARREL_PATH = require.resolve('rxjs');
const RXJS_PACKAGE_ROOT = Path.dirname(RXJS_BARREL_PATH);

const BARREL_INDEX: BarrelIndex = {
  [COMPONENTS_BARREL_PATH]: {
    exports: {
      Button: {
        path: '/test/src/components/Button/Button.tsx',
        type: 'named',
        localName: 'Button',
        importedName: 'Button',
      },
      Modal: {
        path: '/test/src/components/Modal/Modal.tsx',
        type: 'named',
        localName: 'Modal',
        importedName: 'Modal',
      },
    },
  },
  [UTILS_BARREL_PATH]: {
    exports: {
      helper: {
        path: '/test/src/utils/helpers.ts',
        type: 'named',
        localName: 'helper',
        importedName: 'helper',
      },
    },
  },
  [APP_BARREL_PATH]: {
    exports: {
      default: {
        path: '/test/src/app/App.tsx',
        type: 'default',
        localName: 'App',
        importedName: 'default',
      },
    },
  },
  [PARTIAL_BARREL_PATH]: {
    exports: {
      Foo: {
        path: '/test/src/partial/foo.ts',
        type: 'named',
        localName: 'Foo',
        importedName: 'Foo',
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
      },
      firstValueFrom: {
        path: Path.join(RXJS_PACKAGE_ROOT, 'dist/cjs/internal/firstValueFrom.js'),
        type: 'named',
        localName: 'firstValueFrom',
        importedName: 'firstValueFrom',
      },
    },
  },
};

const COMPONENTS_BARREL = BARREL_INDEX[COMPONENTS_BARREL_PATH];
const UTILS_BARREL = BARREL_INDEX[UTILS_BARREL_PATH];
const APP_BARREL = BARREL_INDEX[APP_BARREL_PATH];
const PARTIAL_BARREL = BARREL_INDEX[PARTIAL_BARREL_PATH];
const RXJS_BARREL = BARREL_INDEX[RXJS_BARREL_PATH];

interface TransformOptions {
  code: string;
  barrelIndex?: BarrelIndex | null;
  filename?: string;
}

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

/**
 * Compute expected relative import path from an export's absolute path.
 * Strips extension and ensures path starts with './'.
 */
function toRelativeImportPath(absolutePath: string, fromDir: string): string {
  let relativePath = Path.relative(fromDir, absolutePath);
  relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  return relativePath;
}

/**
 * Compute expected package subpath from an export's absolute path.
 * Uses packageName and packageRoot to create package-style import.
 */
function toPackageImportPath(entry: BarrelFileEntry, exportName: string): string {
  const exportInfo = entry.exports[exportName];
  const relativePath = exportInfo.path
    .slice(entry.packageRoot!.length + 1)
    .replace(/\.(ts|tsx|js|jsx)$/, '');
  return `${entry.packageName}/${relativePath}`;
}

describe('barrel transform plugin', () => {
  describe('named import transformations', () => {
    it('transforms a single named import to direct path', () => {
      const result = transform({ code: `import { Button } from './components';` });

      const expectedPath = toRelativeImportPath(
        COMPONENTS_BARREL.exports.Button.path,
        TEST_FILE_DIR
      );
      expect(result?.code).toContain(expectedPath);
      expect(result?.code).not.toContain(`'./components'`);
    });

    it('transforms multiple named imports to separate direct paths', () => {
      const result = transform({ code: `import { Button, Modal } from './components';` });

      const buttonPath = toRelativeImportPath(COMPONENTS_BARREL.exports.Button.path, TEST_FILE_DIR);
      const modalPath = toRelativeImportPath(COMPONENTS_BARREL.exports.Modal.path, TEST_FILE_DIR);
      expect(result?.code).toContain(buttonPath);
      expect(result?.code).toContain(modalPath);
    });

    it('preserves local alias when transforming', () => {
      const result = transform({ code: `import { Button as MyButton } from './components';` });

      const expectedPath = toRelativeImportPath(
        COMPONENTS_BARREL.exports.Button.path,
        TEST_FILE_DIR
      );
      expect(result?.code).toContain('MyButton');
      expect(result?.code).toContain(expectedPath);
    });

    it('transforms imports from different barrel directories', () => {
      const result = transform({ code: `import { helper } from './utils';` });

      const expectedPath = toRelativeImportPath(UTILS_BARREL.exports.helper.path, TEST_FILE_DIR);
      expect(result?.code).toContain(expectedPath);
    });
  });

  describe('default import transformations', () => {
    it('transforms default import to direct path', () => {
      const result = transform({ code: `import App from './app';` });

      const expectedPath = toRelativeImportPath(APP_BARREL.exports.default.path, TEST_FILE_DIR);
      expect(result?.code).toContain(expectedPath);
    });
  });

  describe('partial barrel coverage', () => {
    it('transforms known exports and preserves unknown exports', () => {
      const result = transform({ code: `import { Foo, Bar } from './partial';` });

      const fooPath = toRelativeImportPath(PARTIAL_BARREL.exports.Foo.path, TEST_FILE_DIR);
      // Foo should be transformed to direct path
      expect(result?.code).toContain(fooPath);
      // Bar stays with original barrel import since it's not in the index
      expect(result?.code).toContain('Bar');
      expect(result?.code).toContain('./partial');
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

      const expectedPath = toPackageImportPath(RXJS_BARREL, 'Observable');
      expect(result?.code).toContain(expectedPath);
      expect(result?.code).not.toMatch(/from ['"]rxjs['"]/);
    });

    it('transforms multiple package imports', () => {
      const result = transform({
        code: `import { Observable, firstValueFrom } from 'rxjs';`,
        filename: REAL_TEST_FILE_PATH,
      });

      expect(result?.code).toContain(toPackageImportPath(RXJS_BARREL, 'Observable'));
      expect(result?.code).toContain(toPackageImportPath(RXJS_BARREL, 'firstValueFrom'));
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
});
