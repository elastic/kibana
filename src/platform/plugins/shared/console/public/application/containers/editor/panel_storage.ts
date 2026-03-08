/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import { getStorage, StorageKeys } from '../../../services';
import { DEBOUNCE_DELAY } from '../../const';

const INITIAL_PANEL_SIZE = 50;

export class PanelStorage {
  private readonly storage = getStorage();

  private debouncedSave = debounce((sizes: number[]) => {
    this.storage.set(StorageKeys.SIZE, sizes);
  }, DEBOUNCE_DELAY);

  getPanelSize(): [number, number] {
    const stored = this.storage.get<unknown>(StorageKeys.SIZE);

    if (
      Array.isArray(stored) &&
      stored.length === 2 &&
      stored.every((v) => typeof v === 'number')
    ) {
      return [stored[0], stored[1]];
    }

    return [INITIAL_PANEL_SIZE, INITIAL_PANEL_SIZE];
  }

  setPanelSize(sizes: Record<string, number>): void {
    this.debouncedSave(Object.values(sizes));
  }
}
