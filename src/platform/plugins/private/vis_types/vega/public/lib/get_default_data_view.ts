/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

/** The default data view, or `undefined` when there is none or it fails to load. */
export const getDefaultDataView = async (
  dataViews: DataViewsPublicPluginStart
): Promise<DataView | undefined> =>
  // A missing default data view shouldn't block editing.
  (await dataViews.getDefault().catch((): null => null)) ?? undefined;
