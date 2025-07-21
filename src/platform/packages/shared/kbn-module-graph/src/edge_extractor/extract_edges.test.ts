/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@babel/parser';
import { ImportExportEdge } from './types';
import { extractEdges } from './extract_edges';
import { createExportEdge, createImportEdge } from './helpers';

function parseAndExtractEdges(code: string): ImportExportEdge[] {
  const resolver = jest.fn().mockImplementation((specifier) => {
    return specifier;
  });

  const file = parse(code, {
    sourceType: 'module',
    plugins: [],
  });

  const result = extractEdges('/my-file.js', { code, ast: file }, resolver);

  return result;
}

describe('extractEdges', () => {
  describe('CommonJS exports', () => {
    it('should extract module.exports assignment', () => {
      const code = 'module.exports = something;';
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'default',
          },
          local: 'something',
        })
      );
    });

    it('should extract exports.* assignments', () => {
      const code = 'exports.foo = bar;';
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'foo',
          },
          local: 'bar',
        })
      );
    });

    it('should extract module.exports.* assignments', () => {
      const code = 'module.exports.bar = baz;';
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'bar',
          },
          local: 'baz',
        })
      );
    });

    it('should extract multiple CommonJS export patterns', () => {
      const code = `
        module.exports = defaultThing;
        exports.named = namedThing;
        module.exports.property = propertyThing;
      `;
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'default',
          },
          local: 'defaultThing',
        })
      );

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'named',
          },
          local: 'namedThing',
        })
      );

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'property',
          },
          local: 'propertyThing',
        })
      );
    });
  });

  describe('ES6 imports', () => {
    it('should extract named imports', () => {
      const code = "import { foo, bar } from 'module'; foo, bar;";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: 'module',
            name: 'foo',
          },
          local: 'foo',
        })
      );

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: 'module',
            name: 'bar',
          },
          local: 'bar',
        })
      );
    });

    it('should extract aliased imports', () => {
      const code = "import { foo as bar } from 'module'; bar;";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: 'module',
            name: 'foo',
          },
          local: 'bar',
        })
      );
    });

    it('should extract namespace imports', () => {
      const code = "import * as ns from 'module'; ns;";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: 'module',
            name: '*',
          },
          local: 'ns',
        })
      );
    });

    it('should extract side-effect imports', () => {
      const code = "import 'module';";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: 'module',
            name: null,
          },
          local: null,
        })
      );
    });

    it('should extract mixed imports', () => {
      const code =
        "import defaultImport, { named, aliased as alias } from 'module'; defaultImport, named, alias;";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: 'module',
            name: 'default',
          },
          local: 'defaultImport',
        })
      );

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: 'module',
            name: 'named',
          },
          local: 'named',
        })
      );

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: 'module',
            name: 'aliased',
          },
          local: 'alias',
        })
      );
    });

    it('should ignore unused imports', () => {
      const code = "import foo from 'module';";
      const edges = parseAndExtractEdges(code);

      expect(edges).toEqual([]);
    });
  });

  describe('CommonJS requires', () => {
    it('should extract require calls', () => {
      const code = "const foo = require('module');";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: 'module',
            name: null,
          },
          // we don't detect `foo` yet
          local: null,
        })
      );
    });

    it.failing('should extract dynamic imports', () => {
      const code = "const foo = await import('module');";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: 'module',
            name: 'default',
          },
          local: null,
        })
      );
    });

    it('should extract awaited dynamic imports', () => {
      const code = "const { foo } = await import('module');";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: 'module',
            name: 'foo',
          },
          local: 'foo',
        })
      );
    });
  });

  describe('ES6 exports', () => {
    it('should extract default exports with identifier', () => {
      const code = 'const foo = 42; export default foo;';
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'default',
          },
          local: 'foo',
        })
      );
    });

    it('should extract default exports with function declaration', () => {
      const code = 'export default function myFunc() {}';
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'default',
          },
          local: 'myFunc',
        })
      );
    });

    it('should extract default exports with anonymous function', () => {
      const code = 'export default function() {}';
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'default',
          },
          local: null,
        })
      );
    });

    it('should extract named exports from specifiers', () => {
      const code = 'const foo = 1, bar = 2; export { foo, bar };';
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'foo',
          },
          local: 'foo',
        })
      );

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'bar',
          },
          local: 'bar',
        })
      );
    });

    it('should extract named exports with aliases', () => {
      const code = 'const foo = 1; export { foo as bar };';
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'bar',
          },
          local: 'foo',
        })
      );
    });

    it('should extract named exports from declarations', () => {
      const code = 'export const foo = 42; export function bar() {} export class Baz {}';
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'foo',
          },
          local: 'foo',
        })
      );
      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'bar',
          },
          local: 'bar',
        })
      );

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'Baz',
          },
          local: 'Baz',
        })
      );
    });

    it('should extract multiple variable exports', () => {
      const code = 'export const foo = 1, bar = 2;';
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'foo',
          },
          local: 'foo',
        })
      );

      expect(edges).toContainEqual(
        createExportEdge({
          export: {
            name: 'bar',
          },
          local: 'bar',
        })
      );
    });
  });

  describe('Re-exports', () => {
    it('should extract export all declarations', () => {
      const code = "export * from 'module';";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          import: {
            path: 'module',
            name: '*',
          },
          export: {
            name: '*',
          },
          local: null,
        })
      );
    });

    it('should extract named re-exports', () => {
      const code = "export { foo, bar as baz } from 'module';";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createExportEdge({
          import: {
            path: 'module',
            name: 'foo',
          },
          export: {
            name: 'foo',
          },
          local: null,
        })
      );
      expect(edges).toContainEqual(
        createExportEdge({
          import: {
            path: 'module',
            name: 'bar',
          },
          export: {
            name: 'baz',
          },
          local: null,
        })
      );
    });
  });

  describe('Complex scenarios', () => {
    it('should handle mixed import/export patterns', () => {
      const code = `
        import React, { useState } from 'react';
        import * as utils from './utils';
        const helper = require('helper');

        console.log(utils);
        
        export const Component = () => React.createElement('div');
        export { useState };
        export * from './types';
        export default Component;
        
        module.exports.legacy = 'value';
      `;
      const edges = parseAndExtractEdges(code);

      // Imports
      expect(edges).toEqual([
        createImportEdge({
          import: {
            path: 'react',
            name: 'default',
          },
          local: 'React',
        }),
        createImportEdge({
          import: {
            path: 'react',
            name: 'useState',
          },
          local: 'useState',
        }),
        createImportEdge({
          import: {
            path: './utils',
            name: '*',
          },
          local: 'utils',
        }),
        createImportEdge({
          import: {
            path: 'helper',
            name: null,
          },
          local: null,
        }),
        createExportEdge({
          export: {
            name: 'Component',
          },
          local: 'Component',
        }),
        createExportEdge({
          export: {
            name: 'useState',
          },
          local: 'useState',
        }),
        createExportEdge({
          import: {
            path: './types',
            name: '*',
          },
          export: {
            name: '*',
          },
          local: null,
        }),
        createExportEdge({
          export: {
            name: 'default',
          },
          local: 'Component',
        }),
        createExportEdge({
          export: {
            name: 'legacy',
          },
          local: null,
        }),
      ]);
    });
  });

  describe('Jest patterns', () => {
    it('should extract dependencies from jest.mock calls', () => {
      const code = "jest.mock('./module');";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: './module',
            name: null,
          },
          local: null,
        })
      );
    });

    it('should extract dependencies from jest.mock with factory', () => {
      const code = "jest.mock('./module', () => ({ default: 'mocked' }));";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: './module',
            name: '*',
          },
          local: null,
        })
      );
    });

    it('should not extract dependencies from jest.requireActual', () => {
      const code = "const actual = jest.requireActual('./module');";
      const edges = parseAndExtractEdges(code);

      expect(edges).toEqual([]);
    });
  });

  describe('Destructured CommonJS require', () => {
    it('should extract named imports from destructured require', () => {
      const code = "const { foo, bar: baz } = require('./lib');";
      const edges = parseAndExtractEdges(code);

      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: './lib',
            name: 'foo',
          },
          local: 'foo',
        })
      );
      expect(edges).toContainEqual(
        createImportEdge({
          import: {
            path: './lib',
            name: 'bar',
          },
          local: 'baz',
        })
      );
    });

    it('should not produce named edges for member access after require', () => {
      const code = "const val = require('./lib').qux;";
      const edges = parseAndExtractEdges(code);

      // Generic edge should still exist
      expect(edges).toEqual([
        createImportEdge({
          import: {
            path: './lib',
            name: null,
          },
          local: null,
        }),
      ]);
    });
  });
});
