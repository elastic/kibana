/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node, Range } from 'yaml';
import { getMonacoRangeFromYamlNode, getMonacoRangeFromYamlRange } from './utils';
import { createMockMonacoModel } from '../../../shared/test_utils/mock_monaco';

/**
 * The mock cannot reuse the factory one as jest.mock is hoisted to the top of the file before imports are resolved,
 * so mockMonacoModule is undefined when the jest.mock callback runs.
 * The mockMonacoModule uses jest.requireActual inside, so it needs to be called lazily.
 * The mock need to be inlined to work here.
 */
jest.mock('@kbn/monaco', () => ({
  ...jest.requireActual('@kbn/monaco'),
  monaco: {
    ...jest.requireActual<typeof import('@kbn/monaco')>('@kbn/monaco').monaco,
    Range: jest.fn((startLine: number, startCol: number, endLine: number, endCol: number) => ({
      startLineNumber: startLine,
      startColumn: startCol,
      endLineNumber: endLine,
      endColumn: endCol,
    })),
  },
}));

describe('getMonacoRangeFromYamlNode', () => {
  const mockModel = createMockMonacoModel('0123456789\n0123456789\n');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when node has no range', () => {
    const node = { range: undefined } as unknown as Node;
    const result = getMonacoRangeFromYamlNode(mockModel, node);
    expect(result).toBeNull();
  });

  it('returns a Range for a node with a valid range', () => {
    const node = { range: [0, 5, 10] } as unknown as Node;
    const result = getMonacoRangeFromYamlNode(mockModel, node);

    expect(result).not.toBeNull();
    expect(result).toEqual(
      expect.objectContaining({
        startLineNumber: expect.any(Number),
        startColumn: expect.any(Number),
        endLineNumber: expect.any(Number),
        endColumn: expect.any(Number),
      })
    );
  });
});

describe('getMonacoRangeFromYamlRange', () => {
  const mockModel = createMockMonacoModel('0123456789\n01234');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a Range from a yaml range tuple', () => {
    const range: Range = [0, 5, 15];
    const result = getMonacoRangeFromYamlRange(mockModel, range);

    expect(result).not.toBeNull();
    expect(result).toEqual(
      expect.objectContaining({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 5,
      })
    );
  });

  it('returns null when getPositionAt returns falsy for start', () => {
    const nullModel = createMockMonacoModel('');
    (nullModel.getPositionAt as jest.Mock).mockReturnValue(null);

    const range: Range = [0, 5, 15];
    const result = getMonacoRangeFromYamlRange(nullModel, range);

    expect(result).toBeNull();
  });
});
