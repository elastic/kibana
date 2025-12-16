/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as babel from '@babel/core';
import type { BarrelIndex } from '../types';

/**
 * Create a mock barrel index for testing.
 * The paths use a fictional /test/ directory structure.
 */
function createMockBarrelIndex(): BarrelIndex {
  return {
    '/test/components/index.ts': {
      exports: {
        Button: {
          path: '/test/components/Button/Button.tsx',
          type: 'named',
          localName: 'Button',
          importedName: 'Button',
        },
        Modal: {
          path: '/test/components/Modal/Modal.tsx',
          type: 'named',
          localName: 'Modal',
          importedName: 'Modal',
        },
      },
    },
    '/test/utils/index.ts': {
      exports: {
        helper: {
          path: '/test/utils/helpers.ts',
          type: 'named',
          localName: 'helper',
          importedName: 'helper',
        },
        format: {
          path: '/test/utils/format.ts',
          type: 'named',
          localName: 'format',
          importedName: 'format',
        },
      },
    },
    '/test/app/index.ts': {
      exports: {
        default: {
          path: '/test/app/App.tsx',
          type: 'default',
          localName: 'App',
          importedName: 'default',
        },
      },
    },
    '/test/mixed/index.ts': {
      exports: {
        Foo: {
          path: '/test/mixed/foo.ts',
          type: 'named',
          localName: 'Foo',
          importedName: 'Foo',
        },
      },
    },
  };
}

/**
 * Transform code using the barrel transform plugin.
 */
function transform(
  code: string,
  filename: string,
  barrelIndex: BarrelIndex | null | undefined
): babel.BabelFileResult | null {
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
  const barrelIndex = createMockBarrelIndex();

  describe('basic transformations', () => {
    it('transforms a single named import from barrel', () => {
      const input = `import { Button } from './components';`;
      const result = transform(input, '/test/file.ts', barrelIndex);

      expect(result?.code).toContain('./components/Button/Button');
      expect(result?.code).not.toContain(`'./components'`);
    });

    it('transforms multiple named imports from same barrel', () => {
      const input = `import { Button, Modal } from './components';`;
      const result = transform(input, '/test/file.ts', barrelIndex);

      expect(result?.code).toContain('./components/Button/Button');
      expect(result?.code).toContain('./components/Modal/Modal');
    });

    it('transforms aliased imports', () => {
      const input = `import { Button as MyButton } from './components';`;
      const result = transform(input, '/test/file.ts', barrelIndex);

      expect(result?.code).toContain('MyButton');
      expect(result?.code).toContain('./components/Button/Button');
    });

    it('transforms imports from different directories', () => {
      const input = `import { helper } from './utils';`;
      const result = transform(input, '/test/file.ts', barrelIndex);

      expect(result?.code).toContain('./utils/helpers');
    });
  });

  describe('default export handling', () => {
    it('transforms default import from barrel', () => {
      const input = `import App from './app';`;
      const result = transform(input, '/test/file.ts', barrelIndex);

      expect(result?.code).toContain('./app/App');
    });
  });

  describe('non-barrel imports', () => {
    it('leaves node_modules imports unchanged', () => {
      const input = `import React from 'react';`;
      const result = transform(input, '/test/file.ts', barrelIndex);

      expect(result?.code).toContain(`from 'react'`);
    });

    it('leaves named node_modules imports unchanged', () => {
      const input = `import { useState } from 'react';`;
      const result = transform(input, '/test/file.ts', barrelIndex);

      expect(result?.code).toContain(`from 'react'`);
    });

    it('leaves imports from non-barrel files unchanged', () => {
      const input = `import { something } from './not-a-barrel';`;
      const result = transform(input, '/test/file.ts', barrelIndex);

      expect(result?.code).toContain(`from './not-a-barrel'`);
    });

    it('leaves namespace imports unchanged', () => {
      const input = `import * as Components from './components';`;
      const result = transform(input, '/test/file.ts', barrelIndex);

      expect(result?.code).toContain(`from './components'`);
    });
  });

  describe('no-op cases', () => {
    it('is a no-op when barrelIndex is null', () => {
      const input = `import { Button } from './components';`;
      const result = transform(input, '/test/file.ts', null);

      expect(result?.code).toContain(`from './components'`);
    });

    it('is a no-op when barrelIndex is undefined', () => {
      const input = `import { Button } from './components';`;
      const result = transform(input, '/test/file.ts', undefined);

      expect(result?.code).toContain(`from './components'`);
    });
  });

  describe('mixed imports', () => {
    it('handles imports where some are in barrel and some are not', () => {
      const input = `import { Foo, Bar } from './mixed';`;
      const result = transform(input, '/test/file.ts', barrelIndex);

      // Foo should be transformed
      expect(result?.code).toContain('./mixed/foo');
      // Bar should stay with original import
      expect(result?.code).toContain('Bar');
      expect(result?.code).toContain('./mixed');
    });
  });

  describe('barrel index serialization', () => {
    it('produces serializable barrel index', () => {
      const serialized = JSON.stringify(barrelIndex);
      const deserialized = JSON.parse(serialized) as BarrelIndex;
      expect(deserialized).toEqual(barrelIndex);
    });
  });
});
