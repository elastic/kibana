/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { createHistory, History } from './history';
export { createStorage, Storage, StorageKeys, setStorage, getStorage } from './storage';
export type { DevToolsSettings } from './settings';
export { createSettings, Settings, DEFAULT_SETTINGS } from './settings';
export {
  AutocompleteInfo,
  getAutocompleteInfo,
  setAutocompleteInfo,
  ENTITIES,
} from './autocomplete';
export { EmbeddableConsoleInfo } from './embeddable_console';
export { httpService } from './http';

export { convertRequestToLanguage } from './api';
