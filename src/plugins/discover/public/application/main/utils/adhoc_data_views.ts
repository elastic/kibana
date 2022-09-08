/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';

const adHocDataViews = new Map<string, DataView>();

export const removeAdHocDataView = (removedDataViewId: string) =>
  adHocDataViews.delete(removedDataViewId);

export const setAdHocDataView = (newDataView: DataView) =>
  adHocDataViews.set(newDataView.id!, newDataView);

export const clearAdHocDataViews = () => adHocDataViews.clear();

export const getAdHocDataViews = (): DataView[] => Array.from(adHocDataViews.values());
