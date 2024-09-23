/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import type { Datatable } from '../expression_types/specs';

export class TablesAdapter extends EventEmitter {
  #tables: { [key: string]: Datatable } = {};

  public allowCsvExport: boolean = false;
  /** Key of table to set as initial selection */
  public initialSelectedTable?: string;

  public logDatatable(key: string, datatable: Datatable): void {
    this.#tables[key] = datatable;
    this.emit('change', this.tables);
  }

  public reset() {
    this.#tables = {};
    this.emit('change', this.tables);
  }

  public get tables() {
    return this.#tables;
  }
}
