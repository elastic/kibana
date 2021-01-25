/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectAttributes } from 'kibana/server';
import { AggConfigOptions } from 'src/plugins/data/common';

export interface VisParams {
  [key: string]: any;
}

export interface SavedVisState<TVisParams = VisParams> {
  title: string;
  type: string;
  params: TVisParams;
  aggs: AggConfigOptions[];
}

export interface VisualizationSavedObjectAttributes extends SavedObjectAttributes {
  description: string;
  kibanaSavedObjectMeta: {
    searchSourceJSON: string;
  };
  title: string;
  version: number;
  visState: string;
  uiStateJSON: string;
}
