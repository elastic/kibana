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
export declare class TablesAdapter extends EventEmitter {
  #private;
  allowCsvExport: boolean;
  /** Key of table to set as initial selection */
  initialSelectedTable?: string;
  logDatatable(key: string, datatable: Datatable): void;
  reset(): void;
  get tables(): {
    [key: string]: Datatable;
  };
}
