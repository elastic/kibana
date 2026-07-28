/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { ExpressionFunctionDefinition } from '../types';
import type { Datatable } from '../../expression_types';
export interface MapColumnArguments {
  id?: string | null;
  name: string;
  expression(datatable: Datatable): Observable<boolean | number | string | null>;
  copyMetaFrom?: string | null;
}
export declare const mapColumn: ExpressionFunctionDefinition<
  'mapColumn',
  Datatable,
  MapColumnArguments,
  Observable<Datatable>
>;
