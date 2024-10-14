/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RefResolver } from '../ref_resolver';
import { Document } from '../document';
import { processDocument } from './process_document';
import { DocumentNodeProcessor } from './document_processors/types/document_node_processor';

jest.mock('../ref_resolver');

describe('processDocument', () => {
  it('invokes processors in the provided order', async () => {
    const resolvedDocument = {
      absolutePath: '/path/to/document',
      document: {} as Document,
    };
    const calls: string[] = [];
    const processor1: DocumentNodeProcessor = {
      onNodeLeave() {
        calls.push('processor1');
      },
    };
    const processor2: DocumentNodeProcessor = {
      onNodeLeave() {
        calls.push('processor2');
      },
    };

    processDocument(resolvedDocument, new RefResolver(), [processor1, processor2]);

    expect(calls).toEqual(['processor1', 'processor2']);
  });

  it('invokes callbacks in expected order (shouldRemove -> enter -> ref -> leave)', async () => {
    const document = {
      id: 'root',
      t1: {
        id: 't1',
        $ref: '#/TestRef',
      },
    };
    const calls: string[] = [];
    const refResolver = new RefResolver();
    const processor: DocumentNodeProcessor = {
      onNodeEnter(node) {
        calls.push(`enter - ${(node as NodeWithId).id}`);
      },
      shouldRemove(node) {
        calls.push(`shouldRemove - ${(node as NodeWithId).id}`);
        return false;
      },
      onRefNodeLeave(node) {
        calls.push(`ref - ${(node as NodeWithId).id}`);
      },
      onNodeLeave(node) {
        calls.push(`leave - ${(node as NodeWithId).id}`);
      },
    };

    const refNode = {
      id: 'TestRef',
      bar: 'foo',
    };

    (refResolver.resolveRef as jest.Mock).mockResolvedValue({
      absolutePath: '/path/to/document',
      document: {
        TestRef: refNode,
      },
      refNode,
      pointer: '/TestRef',
    });

    await processDocument(
      {
        absolutePath: '/path/to/document',
        document: document as unknown as Document,
      },
      refResolver,
      [processor]
    );

    expect(calls).toEqual([
      'shouldRemove - root',
      'enter - root',
      'shouldRemove - t1',
      'enter - t1',
      'shouldRemove - TestRef',
      'enter - TestRef',
      'leave - TestRef',
      'ref - t1',
      'leave - t1',
      'leave - root',
    ]);
  });

  it('removes a node after "shouldRemove" callback returned true', async () => {
    const nodeToRemove = {
      id: 't2',
      foo: 'bar',
    };
    const document = {
      t1: {
        id: 't1',
      },
      t2: nodeToRemove,
    };
    const removeNodeProcessor: DocumentNodeProcessor = {
      shouldRemove(node) {
        return node === nodeToRemove;
      },
    };

    await processDocument(
      {
        absolutePath: '/path/to/document',
        document: document as unknown as Document,
      },
      new RefResolver(),
      [removeNodeProcessor]
    );

    expect(document).toEqual({
      t1: {
        id: 't1',
      },
    });
  });

  it('handles recursive documents', async () => {
    const nodeA: Record<string, unknown> = {
      foo: 'bar',
    };
    const nodeB: Record<string, unknown> = {
      bar: ' foo',
    };

    nodeA.circular = nodeB;
    nodeB.circular = nodeA;

    const document = {
      nodeA,
      nodeB,
    };

    await processDocument(
      {
        absolutePath: '/path/to/document',
        document: document as unknown as Document,
      },
      new RefResolver(),
      []
    );

    expect(document).toBeDefined();
  });

  it('handles self-recursive references', async () => {
    const document = {
      node: {
        $ref: '#/TestComponentCircular',
      },
      TestComponentCircular: {
        $ref: '#/TestComponentCircular',
      },
    };
    const refResolver = new RefResolver();

    (refResolver.resolveRef as jest.Mock).mockResolvedValue({
      absolutePath: '/path/to/document',
      document,
      refNode: {
        $ref: '#/TestComponentCircular',
      },
      pointer: '/TestComponentCircular',
    });

    await processDocument(
      {
        absolutePath: '/path/to/document',
        document: document as unknown as Document,
      },
      refResolver,
      []
    );

    expect(document).toBeDefined();
  });

  it('handles recursive references', async () => {
    const document: Record<string, unknown> = {
      node: {
        $ref: '#/TestComponentCircular',
      },
      TestComponentCircular: {
        $ref: '#/AnotherTestComponentCircular',
      },
      AnotherTestComponentCircular: {
        $ref: '#/TestComponentCircular',
      },
    };
    const refResolver = new RefResolver();

    (refResolver.resolveRef as jest.Mock).mockImplementation((_, pointer) => ({
      absolutePath: '/path/to/document',
      document,
      refNode: document[pointer.slice(1)],
      pointer,
    }));

    await processDocument(
      {
        absolutePath: '/path/to/document',
        document: document as unknown as Document,
      },
      refResolver,
      []
    );

    expect(document).toBeDefined();
  });

  describe('processor', () => {
    describe('node', () => {
      it('gets a root node', async () => {
        const resolvedDocument = {
          absolutePath: '/path/to/document',
          document: {} as Document,
        };

        expect.assertions(3);

        const processor: DocumentNodeProcessor = {
          shouldRemove(node) {
            expect(node).toBe(resolvedDocument.document);

            return false;
          },
          onNodeEnter(node) {
            expect(node).toBe(resolvedDocument.document);
          },
          onNodeLeave(node) {
            expect(node).toBe(resolvedDocument.document);
          },
        };

        await processDocument(resolvedDocument, new RefResolver(), [processor]);
      });

      it('gets a child node', async () => {
        const childNode = {
          childNode: true,
        };
        const resolvedDocument = {
          absolutePath: '/path/to/document',
          document: {
            child: childNode,
          } as Document,
        };

        expect.assertions(3);

        const processor: DocumentNodeProcessor = {
          shouldRemove(node) {
            if (!('childNode' in node)) {
              return false;
            }

            expect(node).toBe(childNode);

            return false;
          },
          onNodeEnter(node) {
            if (!('childNode' in node)) {
              return;
            }

            expect(node).toBe(childNode);
          },
          onNodeLeave(node) {
            if (!('childNode' in node)) {
              return false;
            }

            expect(node).toBe(childNode);
          },
        };

        await processDocument(resolvedDocument, new RefResolver(), [processor]);
      });

      it('gets a ref node', async () => {
        const referencingNode = {
          $ref: '#/refNode',
        };
        const referencedNode = {
          refNode: true,
        };
        const resolvedDocument = {
          absolutePath: '/path/to/document',
          document: {
            node: referencingNode,
            refNode: referencedNode,
          } as Document,
        };

        const refResolver = new RefResolver();

        (refResolver.resolveRef as jest.Mock).mockImplementation((_, pointer) => ({
          absolutePath: '/path/to/document',
          document: resolvedDocument.document,
          refNode: resolvedDocument.document[pointer.slice(1)],
          pointer,
        }));

        expect.assertions(1);

        const processor: DocumentNodeProcessor = {
          onRefNodeLeave(node, resolvedRef) {
            expect(node).toBe(referencingNode);
          },
        };

        await processDocument(resolvedDocument, refResolver, [processor]);
      });

      it('gets a resolved ref', async () => {
        const referencingNode = {
          $ref: '#/refNode',
        };
        const referencedNode = {
          refNode: true,
        };
        const resolvedDocument = {
          absolutePath: '/path/to/document',
          document: {
            node: referencingNode,
            refNode: referencedNode,
          } as Document,
        };

        const refResolver = new RefResolver();

        (refResolver.resolveRef as jest.Mock).mockImplementation((_, pointer) => ({
          absolutePath: '/path/to/document',
          document: resolvedDocument.document,
          refNode: resolvedDocument.document[pointer.slice(1)],
          pointer,
        }));

        expect.assertions(1);

        const processor: DocumentNodeProcessor = {
          onRefNodeLeave(_, resolvedRef) {
            expect(resolvedRef).toEqual({
              absolutePath: '/path/to/document',
              document: resolvedDocument.document,
              refNode: referencedNode,
              pointer: '/refNode',
            });
          },
        };

        await processDocument(resolvedDocument, refResolver, [processor]);
      });
    });

    describe('context', () => {
      it('gets a root node context', async () => {
        const resolvedDocument = {
          absolutePath: '/path/to/document',
          document: {} as Document,
        };

        expect.assertions(3);

        const processor: DocumentNodeProcessor = {
          shouldRemove(_, context) {
            expect(context).toEqual({
              resolvedDocument,
              isRootNode: true,
              parentKey: '',
              parentNode: resolvedDocument.document,
            });

            return false;
          },
          onNodeEnter(_, context) {
            expect(context).toEqual({
              resolvedDocument,
              isRootNode: true,
              parentKey: '',
              parentNode: resolvedDocument.document,
            });
          },
          onNodeLeave(_, context) {
            expect(context).toEqual({
              resolvedDocument,
              isRootNode: true,
              parentKey: '',
              parentNode: resolvedDocument.document,
            });
          },
        };

        await processDocument(resolvedDocument, new RefResolver(), [processor]);
      });

      it('gets a child node context', async () => {
        const resolvedDocument = {
          absolutePath: '/path/to/document',
          document: {
            childNode: {},
          } as Document,
        };

        expect.assertions(3);

        const processor: DocumentNodeProcessor = {
          shouldRemove(_, context) {
            if (context.isRootNode === true) {
              return false;
            }

            expect(context).toEqual({
              resolvedDocument,
              isRootNode: false,
              parentKey: 'childNode',
              parentNode: resolvedDocument.document,
            });

            return false;
          },
          onNodeEnter(_, context) {
            if (context.isRootNode === true) {
              return false;
            }

            expect(context).toEqual({
              resolvedDocument,
              isRootNode: false,
              parentKey: 'childNode',
              parentNode: resolvedDocument.document,
            });
          },
          onNodeLeave(_, context) {
            if (context.isRootNode === true) {
              return false;
            }

            expect(context).toEqual({
              resolvedDocument,
              isRootNode: false,
              parentKey: 'childNode',
              parentNode: resolvedDocument.document,
            });
          },
        };

        await processDocument(resolvedDocument, new RefResolver(), [processor]);
      });

      it('gets a ref node context', async () => {
        const referencingNode = {
          $ref: '#/refNode',
        };
        const referencedNode = {
          refNode: true,
        };
        const resolvedDocument = {
          absolutePath: '/path/to/document',
          document: {
            node: referencingNode,
            refNode: referencedNode,
          } as Document,
        };

        const refResolver = new RefResolver();

        (refResolver.resolveRef as jest.Mock).mockImplementation((_, pointer) => ({
          absolutePath: '/path/to/document',
          document: resolvedDocument.document,
          refNode: resolvedDocument.document[pointer.slice(1)],
          pointer,
        }));

        expect.assertions(1);

        const processor: DocumentNodeProcessor = {
          onRefNodeLeave(_, __, context) {
            expect(context).toEqual({
              resolvedDocument,
              isRootNode: false,
              parentKey: 'node',
              parentNode: resolvedDocument.document,
            });
          },
        };

        await processDocument(resolvedDocument, refResolver, [processor]);
      });
    });
  });
});

interface NodeWithId {
  id?: string;
}
