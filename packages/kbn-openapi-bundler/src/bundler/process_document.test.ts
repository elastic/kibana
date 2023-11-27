/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { processDocument } from './process_document';
import { RefResolver } from './ref_resolver';
import { Document, DocumentNodeProcessor } from './types';

jest.mock('./ref_resolver');

describe('processDocument', () => {
  it('invokes processors in the provided order', async () => {
    const resolvedDocument = {
      absolutePath: '/path/to/document',
      document: {} as Document,
    };
    const calls: string[] = [];
    const processor1 = {
      leave() {
        calls.push('processor1');
      },
    };
    const processor2 = {
      leave() {
        calls.push('processor2');
      },
    };

    processDocument(resolvedDocument, new RefResolver(), [processor1, processor2]);

    expect(calls).toEqual(['processor1', 'processor2']);
  });

  it('invokes callbacks in expected order (enter -> ref -> leave)', async () => {
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
      enter(node) {
        calls.push(`enter - ${(node as NodeWithId).id}`);
        return false;
      },
      ref(node) {
        calls.push(`ref - ${(node as NodeWithId).id}`);
      },
      leave(node) {
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
      'enter - root',
      'enter - t1',
      'enter - TestRef',
      'leave - TestRef',
      'ref - t1',
      'leave - t1',
      'leave - root',
    ]);
  });

  it('removes a node after "enter" callback returned true', async () => {
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
      enter(node) {
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
});

interface NodeWithId {
  id?: string;
}
