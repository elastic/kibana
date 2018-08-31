/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RootState } from '../reducers';

export const getTree = (state: RootState) => state.file.tree;

export const lastRequestPathSelector = state => state.symbol.lastRequestPath;

export const structureSelector = state => {
  const pathname = lastRequestPathSelector(state);
  const symbols = state.symbol.structureTree[pathname];
  return symbols || [];
};

export const refUrlSelector = (state: RootState) => {
  const payload = state.editor.refPayload;
  if (payload) {
    const { line, character } = payload.position;
    return `${payload.textDocument.uri}!L${line}:${character}`;
  }
  return undefined;
};

export const fileSelector = (state: RootState) => state.file.file;
