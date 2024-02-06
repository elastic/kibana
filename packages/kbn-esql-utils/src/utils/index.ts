/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

// uses browser sha256 method with fallback if unavailable
async function sha256(str: string) {
  if (crypto.subtle) {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(str));
    return Array.from(new Uint8Array(hash))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
  } else {
    const { sha256: sha256fn } = await import('./sha256');
    return sha256fn(str);
  }
}

// Some applications need to have a dataview to work properly with ES|QL queries
// This is a helper to create one. The id is constructed from the indexpattern.
// As there are no runtime fields or field formatters or default time fields
// the same adhoc dataview can be constructed/used. This comes with great advantages such
// as solving the problem descibed here https://github.com/elastic/kibana/issues/168131
export async function getESQLAdHocDataview(
  indexPattern: string,
  dataViewsService: DataViewsPublicPluginStart
) {
  return await dataViewsService.create({
    title: indexPattern,
    id: await sha256(`esql-${indexPattern}`),
  });
}
