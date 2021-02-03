/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Settings } from './settings';

export class SettingsMock extends Settings {
  getAutocomplete = jest.fn();
  getFontSize = jest.fn();
  getPolling = jest.fn();
  getTripleQuotes = jest.fn();
  getWrapMode = jest.fn();
  setAutocomplete = jest.fn();
  setFontSize = jest.fn();
  setPolling = jest.fn();
  setTripleQuotes = jest.fn();
  setWrapMode = jest.fn();
  toJSON = jest.fn();
  updateSettings = jest.fn();
}
