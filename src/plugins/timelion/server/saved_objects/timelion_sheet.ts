/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsType } from 'kibana/server';

export const timelionSheetSavedObjectType: SavedObjectsType = {
  name: 'timelion-sheet',
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: {
      description: { type: 'text' },
      hits: { type: 'integer' },
      kibanaSavedObjectMeta: {
        properties: {
          searchSourceJSON: { type: 'text' },
        },
      },
      timelion_chart_height: { type: 'integer' },
      timelion_columns: { type: 'integer' },
      timelion_interval: { type: 'keyword' },
      timelion_other_interval: { type: 'keyword' },
      timelion_rows: { type: 'integer' },
      timelion_sheet: { type: 'text' },
      title: { type: 'text' },
      version: { type: 'integer' },
    },
  },
};
