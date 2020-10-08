/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EventEmitter } from 'events';
import { TabularCallback, TabularHolder, TabularLoaderOptions } from './types';

class DataAdapter extends EventEmitter {
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

export { DataAdapter };
