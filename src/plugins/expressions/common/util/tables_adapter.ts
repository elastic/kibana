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
import { Datatable } from '../expression_types/specs';

export class TablesAdapter extends EventEmitter {
  private _tables: { [key: string]: Datatable } = {};

  public logDatatable(name: string, datatable: Datatable): void {
    this._tables[name] = datatable;
    this.emit('change', this.tables);
  }

  public get tables() {
    return this._tables;
  }
}
