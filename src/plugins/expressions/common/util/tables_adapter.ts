/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
