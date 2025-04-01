/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createNamespaceComponentsProcessor } from './namespace_components';

describe('namespaceComponentsProcessor', () => {
  it.each([
    {
      sourceValue: 'Something',
      originalRef: '#/components/schemas/SomeComponent',
      expectedRef: '#/components/schemas/Something_SomeComponent',
    },
    {
      sourceValue: 'Some Domain API (Extra Information)',
      originalRef: '#/components/schemas/SomeComponent',
      expectedRef: '#/components/schemas/Some_Domain_API_SomeComponent',
    },
    {
      sourceValue: 'Hello, world!',
      originalRef: '#/components/schemas/SomeComponent',
      expectedRef: '#/components/schemas/Hello_world_SomeComponent',
    },
    {
      sourceValue: 'Something',
      originalRef: '../path/to/some.schema.yaml#/components/schemas/SomeComponent',
      expectedRef: '../path/to/some.schema.yaml#/components/schemas/Something_SomeComponent',
    },
    {
      sourceValue: 'Some Domain API (Extra Information)',
      originalRef: '../path/to/some.schema.yaml#/components/schemas/SomeComponent',
      expectedRef: '../path/to/some.schema.yaml#/components/schemas/Some_Domain_API_SomeComponent',
    },
    {
      sourceValue: 'Hello, world!',
      originalRef: '../path/to/some.schema.yaml#/components/schemas/SomeComponent',
      expectedRef: '../path/to/some.schema.yaml#/components/schemas/Hello_world_SomeComponent',
    },
  ])(
    'prefixes reference "$originalRef" with normalized "$sourceValue"',
    ({ sourceValue, originalRef, expectedRef }) => {
      const processor = createNamespaceComponentsProcessor('/info/title');

      const document = {
        info: {
          title: sourceValue,
        },
      };

      processor.onNodeEnter?.(document, {
        resolvedDocument: { absolutePath: '', document },
        isRootNode: true,
        parentNode: document,
        parentKey: '',
      });

      const node = { $ref: originalRef };

      processor.onRefNodeLeave?.(
        node,
        { pointer: '', refNode: {}, absolutePath: '', document: {} },
        {
          resolvedDocument: { absolutePath: '', document },
          isRootNode: false,
          parentNode: document,
          parentKey: '',
        }
      );

      expect(node).toMatchObject({
        $ref: expectedRef,
      });
    }
  );

  it('prefixes security requirements', () => {
    const processor = createNamespaceComponentsProcessor('/info/title');

    const document = {
      info: {
        title: 'Something',
      },
    };

    processor.onNodeEnter?.(document, {
      resolvedDocument: { absolutePath: '', document },
      isRootNode: true,
      parentNode: document,
      parentKey: '',
    });

    const node = { security: [{ SomeSecurityRequirement: [] }] };

    processor.onNodeLeave?.(node, {
      resolvedDocument: { absolutePath: '', document },
      isRootNode: false,
      parentNode: document,
      parentKey: '',
    });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    expect(node).toMatchObject({ security: [{ Something_SomeSecurityRequirement: [] }] });
  });

  it('prefixes security requirement components', () => {
    const processor = createNamespaceComponentsProcessor('/info/title');

    const document = {
      info: {
        title: 'Something',
      },
      components: {
        securitySchemes: {
          BasicAuth: {
            scheme: 'basic',
            type: 'http',
          },
        },
      },
    };

    processor.onNodeEnter?.(document, {
      resolvedDocument: { absolutePath: '', document },
      isRootNode: true,
      parentNode: document,
      parentKey: '',
    });

    processor.onNodeLeave?.(document, {
      resolvedDocument: { absolutePath: '', document },
      isRootNode: true,
      parentNode: document,
      parentKey: '',
    });

    expect(document.components.securitySchemes).toMatchObject({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Something_BasicAuth: {
        scheme: 'basic',
        type: 'http',
      },
    });
  });
});
