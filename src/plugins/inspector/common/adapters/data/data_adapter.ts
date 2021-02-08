/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventEmitter } from 'events';
import { TabularCallback, TabularHolder, TabularLoaderOptions } from './types';

export class DataAdapter extends EventEmitter {
  private tabular?: TabularCallback;
  private tabularOptions?: TabularLoaderOptions;

  public setTabularLoader(callback: TabularCallback, options: TabularLoaderOptions = {}): void {
    this.tabular = callback;
    this.tabularOptions = options;
    this.emit('change', 'tabular');
  }

  public getTabular(): Promise<TabularHolder> {
    if (!this.tabular || !this.tabularOptions) {
      return Promise.resolve({ data: null, options: {} });
    }
    const options = this.tabularOptions;
    return Promise.resolve(this.tabular()).then((data) => ({ data, options }));
  }
}
