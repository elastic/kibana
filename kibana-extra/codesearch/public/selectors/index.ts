/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createSelector } from 'reselect';
import { Location, SymbolInformation, SymbolKind } from 'vscode-languageserver-types/lib/esm/main';

import { RootState } from '../reducers';

export const getTree = (state: RootState) => state.file.tree;

export interface SymbolWithMembers extends SymbolInformation {
  members?: Set<SymbolInformation>;
}

export const lastRequestPathSelector = state => state.symbol.lastRequestPath;

const symbolsSelector = state => {
  const pathname = lastRequestPathSelector(state);
  const symbols = state.symbol.symbols[pathname];
  return symbols || [];
};

const structureTreeSelector: (symbols: SymbolInformation[]) => any = symbols => {
  const structureTree: SymbolWithMembers[] = [];

  function isOneLocationInAnotherLocation(oneLocation: Location, anotherLocation: Location) {
    const {
      line: oneLocationStartLine,
      character: oneLocationStartCharacter,
    } = oneLocation.range.start;
    const { line: oneLocationEndLine, character: oneLocationEndCharacter } = oneLocation.range.end;
    const {
      line: anotherLocationStartLine,
      character: anotherLocationStartCharacter,
    } = anotherLocation.range.start;
    const {
      line: anotherLocationEndLine,
      character: anotherLocationEndCharacter,
    } = anotherLocation.range.end;
    return (
      (oneLocationStartLine > anotherLocationStartLine ||
        (oneLocationStartLine === anotherLocationStartLine &&
          oneLocationStartCharacter >= anotherLocationStartCharacter)) &&
      (oneLocationEndLine < anotherLocationEndLine ||
        (oneLocationEndLine === anotherLocationEndLine &&
          oneLocationEndCharacter <= anotherLocationEndCharacter))
    );
  }

  function findContainer(containerName: string, location: Location): SymbolInformation | undefined {
    return symbols.find(
      (s: SymbolInformation) =>
        s.name === containerName && isOneLocationInAnotherLocation(location, s.location)
    );
  }

  symbols.forEach((s: SymbolInformation) => {
    if (s.containerName && s.kind !== SymbolKind.Class) {
      const container = findContainer(s.containerName, s.location);
      if (container) {
        if (container.members) {
          container.members.add(s);
        } else {
          container.members = new Set([s]);
        }
      }
    } else {
      structureTree.push(s);
    }
  });

  return structureTree;
};

export const symbolTreeSelector = createSelector(symbolsSelector, structureTreeSelector);

export const refUrlSelector = (state: RootState) => {
  const payload = state.editor.refPayload;
  if (payload) {
    const { line, character } = payload.position;
    return `${payload.textDocument.uri}!L${line}:${character}`;
  }
  return undefined;
};

export const fileSelector = (state: RootState) => state.file.file;
