/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseSync, types } from '@babel/core';
import { extractEdges } from './extract_edges';
import { createExportEdge, createImportEdge } from './helpers';
import { normalizeEdges } from './normalize_edges';

describe('normalizeEdges', () => {
  const resolver = jest.fn().mockImplementation((specifier) => {
    return specifier;
  });

  function createEdges(code: string) {
    return extractEdges(
      '/src/my-file.js',
      {
        code,
        ast: parseSync(code, { filename: '/src/my-file.js', ast: true }) as types.File,
      },
      resolver
    );
  }

  it('should identify simple implicit re-exports', () => {
    const edges = createEdges(`
      import { foo } from './module-a';
      export { foo };
    `);

    const result = normalizeEdges(edges);

    expect(result).toEqual([
      createImportEdge({
        import: {
          path: './module-a',
          name: 'foo',
        },
        local: 'foo',
      }),
      createExportEdge({
        import: {
          path: './module-a',
          name: 'foo',
        },
        export: {
          name: 'foo',
        },
        local: 'foo',
      }),
    ]);
  });

  it('should handle multiple implicit re-exports', () => {
    const edges = createEdges(`
      import { foo } from "./module-a";
      import { bar } from "./module-b";
      export { foo, bar };  
    `);

    const result = normalizeEdges(edges);

    // Imports should remain unchanged
    expect(result).toEqual([
      createImportEdge({
        import: {
          path: './module-a',
          name: 'foo',
        },
        local: 'foo',
      }),
      createImportEdge({
        import: {
          path: './module-b',
          name: 'bar',
        },
        local: 'bar',
      }),
      createExportEdge({
        import: {
          path: './module-a',
          name: 'foo',
        },
        export: {
          name: 'foo',
        },
        local: 'foo',
      }),
      createExportEdge({
        import: {
          path: './module-b',
          name: 'bar',
        },
        export: {
          name: 'bar',
        },
        local: 'bar',
      }),
    ]);
  });

  it('should preserve local exports that are not re-exports', () => {
    const edges = createEdges(`
      import { imported } from "./module-a";
      const local = "local";
      export { imported };
      export { local };  
    `);

    const result = normalizeEdges(edges);

    expect(result).toEqual([
      {
        import: {
          path: './module-a',
          name: 'imported',
        },
        local: 'imported',
      },
      {
        import: {
          path: './module-a',
          name: 'imported',
        },
        export: {
          name: 'imported',
        },
        local: 'imported',
      },
      {
        export: {
          name: 'local',
        },
        local: 'local',
      },
    ]);
  });

  it('should preserve explicit re-exports', () => {
    const edges = createEdges(`
      export { explicitReExport } from 'external-module';
    `);

    const result = normalizeEdges(edges);

    expect(result).toEqual([
      createExportEdge({
        import: {
          path: 'external-module',
          name: 'explicitReExport',
        },
        export: {
          name: 'explicitReExport',
        },
        local: null,
      }),
    ]);
  });

  it('should handle aliased imports and exports', () => {
    const edges = createEdges(`
      import { original as aliased } from "./module-a";
      export { aliased as exported };  
    `);

    const result = normalizeEdges(edges);

    expect(result).toEqual([
      createImportEdge({
        import: {
          name: 'original',
          path: './module-a',
        },
        local: 'aliased',
      }),
      createExportEdge({
        import: {
          name: 'original',
          path: './module-a',
        },
        export: {
          name: 'exported',
        },
        local: 'aliased',
      }),
    ]);
  });

  it('should handle default imports and exports', () => {
    const edges = createEdges(`
      import defaultImport from "./module-a";
      export default defaultImport;
    `);

    const result = normalizeEdges(edges);

    expect(result).toEqual([
      createImportEdge({
        import: {
          path: './module-a',
          name: 'default',
        },
        local: 'defaultImport',
      }),
      createExportEdge({
        import: {
          path: './module-a',
          name: 'default',
        },
        export: {
          name: 'default',
        },
        local: 'defaultImport',
      }),
    ]);
  });

  it('should handle namespace imports', () => {
    const edges = createEdges(`
      import * as ns from "./module-a";
      export { ns as namespace };  
    `);

    const result = normalizeEdges(edges);

    expect(result).toEqual([
      createImportEdge({
        import: {
          path: './module-a',
          name: '*',
        },
        local: 'ns',
      }),
      createExportEdge({
        import: {
          path: './module-a',
          name: '*',
        },
        export: {
          name: 'namespace',
        },
        local: 'ns',
      }),
    ]);
  });

  it('should handle side-effect imports (no local name)', () => {
    const edges = createEdges(`
      import "./module-a";
      const something = "something";
      export { something };  
    `);

    const result = normalizeEdges(edges);

    expect(result).toEqual([
      createImportEdge({
        import: {
          path: './module-a',
          name: null,
        },
        local: null,
      }),
      createExportEdge({
        export: {
          name: 'something',
        },
        local: 'something',
      }),
    ]);
  });

  it('should handle complex mixed scenarios', () => {
    const edges = createEdges(`
      import React, { useState } from "react";
      import * as _ from "lodash";
      import "./side-effect-only";
      
      function LocalComponent ( ) {

      }

      export default React;
      export { useState };
      export { _ as utilities };
      export { LocalComponent };

      export { explicitReExport} from "external-module";
    `);

    const result = normalizeEdges(edges);

    expect(result).toEqual([
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
          path: 'lodash',
          name: '*',
        },
        local: '_',
      }),
      createImportEdge({
        import: {
          path: './side-effect-only',
          name: null,
        },
        local: null,
      }),
      createExportEdge({
        import: {
          path: 'react',
          name: 'default',
        },
        export: {
          name: 'default',
        },
        local: 'React',
      }),
      createExportEdge({
        import: {
          path: 'react',
          name: 'useState',
        },
        export: {
          name: 'useState',
        },
        local: 'useState',
      }),
      createExportEdge({
        import: {
          path: 'lodash',
          name: '*',
        },
        export: {
          name: 'utilities',
        },
        local: '_',
      }),
      createExportEdge({
        export: {
          name: 'LocalComponent',
        },
        local: 'LocalComponent',
      }),
      createExportEdge({
        import: {
          path: 'external-module',
          name: 'explicitReExport',
        },
        export: {
          name: 'explicitReExport',
        },
        local: null,
      }),
    ]);
  });
});
