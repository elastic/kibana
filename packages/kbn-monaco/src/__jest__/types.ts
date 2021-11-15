/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface MockIModel {
  uri: string;
  id: string;
  value: string;
  changeContentListeners: Array<() => void>;
  getModeId: () => string;
  setValue: (value: string) => void;
  getValue: () => string;
  onDidChangeContent: (handler: () => void) => void;
  onDidChangeLanguage: (handler: (options: { newLanguage: string }) => void) => void;
}
