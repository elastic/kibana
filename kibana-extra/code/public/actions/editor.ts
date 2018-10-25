/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { Hover, Location, Position, TextDocumentPositionParams } from 'vscode-languageserver';

export interface LineRange {
  startLine: number;
  endLine: number;
}

export interface GroupedRepoReferences {
  repo: string;
  files: GroupedFileReferences[];
}

export interface GroupedFileReferences {
  path: string;
  language?: string;
  codes: CodeAndLocation[];
}

export interface CodeAndLocation {
  lineRange: LineRange;
  code: string;
  locations: Location[];
}

export const findReferences = createAction<TextDocumentPositionParams>('FIND REFERENCES');
export const findReferencesSuccess = createAction<GroupedRepoReferences[]>(
  'FIND REFERENCES SUCCESS'
);
export const findReferencesFailed = createAction<Error>('FIND REFERENCES ERROR');
export const closeReferences = createAction('CLOSE REFERENCES');
export const hoverResult = createAction<Hover>('HOVER RESULT');
export const revealPosition = createAction<Position>('REVEAL POSITION');
