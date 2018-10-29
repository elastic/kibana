/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { Hover, Location, Position, TextDocumentPositionParams } from 'vscode-languageserver';

export interface CodeAndLocation {
  repo: string;
  path: string;
  code: string;
  language?: string;
  location: Location;
  startLine?: number;
  endLine?: number;
}

export const findReferences = createAction<TextDocumentPositionParams>('FIND REFERENCES');
export const findReferencesSuccess = createAction<CodeAndLocation[]>('FIND REFERENCES SUCCESS');
export const findReferencesFailed = createAction<Error>('FIND REFERENCES ERROR');
export const closeReferences = createAction('CLOSE REFERENCES');
export const hoverResult = createAction<Hover>('HOVER RESULT');
export const revealPosition = createAction<Position>('REVEAL POSITION');
