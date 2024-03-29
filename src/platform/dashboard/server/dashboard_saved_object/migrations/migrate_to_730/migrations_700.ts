/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';

import { SavedObjectMigrationFn } from '@kbn/core/server';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';

import { DashboardDoc700To720 } from './types';

function migrateIndexPattern(doc: DashboardDoc700To720) {
  const searchSourceJSON = get(doc, 'attributes.kibanaSavedObjectMeta.searchSourceJSON');
  if (typeof searchSourceJSON !== 'string') {
    return;
  }
  let searchSource;
  try {
    searchSource = JSON.parse(searchSourceJSON);
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
    return;
  }
  if (searchSource.index) {
    searchSource.indexRefName = 'kibanaSavedObjectMeta.searchSourceJSON.index';
    doc.references.push({
      name: searchSource.indexRefName,
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      id: searchSource.index,
    });
    delete searchSource.index;
  }
  if (searchSource.filter) {
    searchSource.filter.forEach((filterRow: any, i: number) => {
      if (!filterRow.meta || !filterRow.meta.index) {
        return;
      }
      filterRow.meta.indexRefName = `kibanaSavedObjectMeta.searchSourceJSON.filter[${i}].meta.index`;
      doc.references.push({
        name: filterRow.meta.indexRefName,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: filterRow.meta.index,
      });
      delete filterRow.meta.index;
    });
  }
  doc.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(searchSource);
}

export const migrations700: SavedObjectMigrationFn<any, any> = (doc): DashboardDoc700To720 => {
  // Set new "references" attribute
  doc.references = doc.references || [];

  // Migrate index pattern
  migrateIndexPattern(doc as DashboardDoc700To720);
  // Migrate panels
  const panelsJSON = get(doc, 'attributes.panelsJSON');
  if (typeof panelsJSON !== 'string') {
    return doc as DashboardDoc700To720;
  }
  let panels;
  try {
    panels = JSON.parse(panelsJSON);
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
    return doc as DashboardDoc700To720;
  }
  if (!Array.isArray(panels)) {
    return doc as DashboardDoc700To720;
  }
  panels.forEach((panel, i) => {
    if (!panel.type || !panel.id) {
      return;
    }
    panel.panelRefName = `panel_${i}`;
    doc.references!.push({
      name: `panel_${i}`,
      type: panel.type,
      id: panel.id,
    });
    delete panel.type;
    delete panel.id;
  });
  doc.attributes.panelsJSON = JSON.stringify(panels);
  return doc as DashboardDoc700To720;
};
