/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRequestDataScannerTokens, type RequestDataToken } from './tokens';

type StructuralPieceKind = 'openBrace' | 'closeBrace' | 'text';

interface StructuralPiece {
  readonly kind: StructuralPieceKind;
  readonly value: string;
}

type RequestDataPiece = RequestDataToken | StructuralPiece;

interface SplitState {
  readonly currentObject: string;
  readonly depth: number;
  readonly hasCompletedTopLevelObject: boolean;
}

const getStructuralPieceKind = (value: string): StructuralPieceKind => {
  if (value === '{') {
    return 'openBrace';
  }
  if (value === '}') {
    return 'closeBrace';
  }
  return 'text';
};

const getStructuralPieces = (source: string): StructuralPiece[] => {
  return source
    .split(/([{}])/)
    .filter(Boolean)
    .map((value) => ({ kind: getStructuralPieceKind(value), value }));
};

const getRequestDataPieces = (source: string): RequestDataPiece[] => {
  const tokens = getRequestDataScannerTokens(source);
  const piecesBeforeTokens = tokens.flatMap((token, index) => {
    const previousTokenEnd = tokens[index - 1]?.end ?? 0;
    return [...getStructuralPieces(source.slice(previousTokenEnd, token.start)), token];
  });
  const trailingTokenEnd = tokens.at(-1)?.end ?? 0;

  return [...piecesBeforeTokens, ...getStructuralPieces(source.slice(trailingTokenEnd))];
};

const appendPiece = (state: SplitState, piece: RequestDataPiece): SplitState => {
  return { ...state, currentObject: state.currentObject + piece.value };
};

const trimDataObject = (dataObject: string): string => {
  const trimmedStart = dataObject.trimStart();
  const trailingToken = getRequestDataScannerTokens(trimmedStart).at(-1);
  const endsWithUnclosedBlockComment =
    trailingToken?.kind === 'blockComment' &&
    trailingToken.end === trimmedStart.length &&
    !trailingToken.value.endsWith('*/');

  return endsWithUnclosedBlockComment ? dataObject : trimmedStart.trimEnd();
};

const completeCurrentObject = (state: SplitState, dataObjects: string[]): SplitState => {
  const object = trimDataObject(state.currentObject);
  if (object) {
    dataObjects.push(object);
  }

  return {
    currentObject: '',
    depth: 0,
    hasCompletedTopLevelObject: false,
  };
};

const consumeObjectPiece = (state: SplitState, piece: RequestDataPiece): SplitState => {
  const nextState = appendPiece(state, piece);

  if (piece.kind === 'openBrace') {
    return { ...nextState, depth: state.depth + 1 };
  }
  if (piece.kind === 'closeBrace') {
    const depth = state.depth - 1;
    return { ...nextState, depth, hasCompletedTopLevelObject: depth === 0 };
  }

  return nextState;
};

const isTrailingPiece = (piece: RequestDataPiece): boolean => {
  return (
    piece.kind === 'lineComment' ||
    piece.kind === 'blockComment' ||
    (piece.kind === 'text' && /^\s*$/.test(piece.value))
  );
};

const consumeSplitPiece = (
  state: SplitState,
  piece: RequestDataPiece,
  dataObjects: string[]
): SplitState => {
  if (!state.hasCompletedTopLevelObject || isTrailingPiece(piece)) {
    return consumeObjectPiece(state, piece);
  }

  return consumeObjectPiece(completeCurrentObject(state, dataObjects), piece);
};

export const splitRequestDataObjects = (dataString: string): string[] => {
  const dataObjects: string[] = [];
  const state = getRequestDataPieces(dataString).reduce<SplitState>(
    (currentState, piece) => consumeSplitPiece(currentState, piece, dataObjects),
    {
      currentObject: '',
      depth: 0,
      hasCompletedTopLevelObject: false,
    }
  );
  const lastObject = trimDataObject(state.currentObject);

  return lastObject ? [...dataObjects, lastObject] : dataObjects;
};
