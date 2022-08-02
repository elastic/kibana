/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { DashboardDoc730ToLatest } from '../../common';

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
