/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewBase } from '@kbn/es-query';
import type { IIndexPatternFieldList } from '../fields';
import type { DataViewFieldMap } from '../types';
import { AbstractDataView } from './abstract_data_views';
import { DataViewDeps } from './data_view';

export class DataViewAsync extends AbstractDataView implements DataViewBase {
  public fields: IIndexPatternFieldList & { toSpec: () => DataViewFieldMap };
  constructor(config: DataViewDeps) {
    super(config);
    this.fields = {} as IIndexPatternFieldList & { toSpec: () => DataViewFieldMap };
  }
}
