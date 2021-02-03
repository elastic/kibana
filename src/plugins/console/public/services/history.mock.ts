/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { History } from './history';

export class HistoryMock extends History {
  addToHistory = jest.fn();
  change = jest.fn();
  clearHistory = jest.fn();
  deleteLegacySavedEditorState = jest.fn();
  getHistory = jest.fn();
  getHistoryKeys = jest.fn();
  getLegacySavedEditorState = jest.fn();
  updateCurrentState = jest.fn();
}
