/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inspect } from 'util';
import { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import { moveFiltersToQuery } from './move_filters_to_query';
import { migratePanelsTo730 } from './migrate_to_730_panels';
import { DashboardDoc730ToLatest, DashboardDoc700To720 } from './types';

function isDoc(
  doc: { [key: string]: unknown } | SavedObjectUnsanitizedDoc
): doc is SavedObjectUnsanitizedDoc {
  return (
    typeof doc.id === 'string' &&
    typeof doc.type === 'string' &&
    doc.attributes !== null &&
    typeof doc.attributes === 'object' &&
    doc.references !== null &&
    typeof doc.references === 'object'
  );
}

export function isDashboardDoc(
  doc: { [key: string]: unknown } | DashboardDoc730ToLatest
): doc is DashboardDoc730ToLatest {
  if (!isDoc(doc)) {
    return false;
  }

  if (typeof (doc as DashboardDoc730ToLatest).attributes.panelsJSON !== 'string') {
    return false;
  }

  return true;
}

export const migrations730 = (doc: DashboardDoc700To720, { log }: SavedObjectMigrationContext) => {
  if (!isDashboardDoc(doc)) {
    // NOTE: we should probably throw an error here... but for now following suit and in the
    // case of errors, just returning the same document.
    return doc;
  }

  try {
    const searchSource = JSON.parse(doc.attributes.kibanaSavedObjectMeta.searchSourceJSON);
    doc.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(
      moveFiltersToQuery(searchSource)
    );
  } catch (e) {
    log.warn(
      `Exception @ migrations730 while trying to migrate dashboard query filters!\n` +
        `${e.stack}\n` +
        `dashboard: ${inspect(doc, false, null)}`
    );
    return doc;
  }

  let uiState = {};
  // Ignore errors, at some point uiStateJSON stopped being used, so it may not exist.
  if (doc.attributes.uiStateJSON && doc.attributes.uiStateJSON !== '') {
    uiState = JSON.parse(doc.attributes.uiStateJSON);
  }

  try {
    const panels = JSON.parse(doc.attributes.panelsJSON);
    doc.attributes.panelsJSON = JSON.stringify(
      migratePanelsTo730(
        panels,
        '7.3.0',
        doc.attributes.useMargins === undefined ? true : doc.attributes.useMargins,
        uiState
      )
    );

    delete doc.attributes.uiStateJSON;
  } catch (e) {
    log.warn(
      `Exception @ migrations730 while trying to migrate dashboard panels!\n` +
        `Error: ${e.stack}\n` +
        `dashboard: ${inspect(doc, false, null)}`
    );
    return doc;
  }

  return doc as DashboardDoc730ToLatest;
};
