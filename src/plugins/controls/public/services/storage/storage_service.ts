/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ControlsStorageService } from './types';

const STORAGE_KEY = 'controls:showInvalidSelectionWarning';

class StorageService implements ControlsStorageService {
  private storage: Storage;

  constructor() {
    this.storage = new Storage(localStorage);
  }

  getShowInvalidSelectionWarning = () => {
    return this.storage.get(STORAGE_KEY);
  };

  setShowInvalidSelectionWarning = (value: boolean) => {
    this.storage.set(STORAGE_KEY, value);
  };
}

export const controlsStorageServiceFactory = () => new StorageService();
