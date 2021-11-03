/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectAttributes } from 'kibana/server';
import type { SerializableRecord } from '@kbn/utility-types';
import { AggConfigSerialized } from 'src/plugins/data/common';

export interface VisParams {
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SavedVisState<TVisParams = SerializableRecord> = {
  title: string;
  type: string;
  params: TVisParams;
  aggs: AggConfigSerialized[];
};

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
