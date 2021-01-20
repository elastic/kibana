/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getServices } from './kibana_services';

const sampleDataUrl = '/api/sample_data';

function clearIndexPatternsCache() {
  getServices().indexPatternService.clearCache();
}

export async function listSampleDataSets() {
  return await getServices().http.get(sampleDataUrl);
}

export async function installSampleDataSet(id, sampleDataDefaultIndex) {
  await getServices().http.post(`${sampleDataUrl}/${id}`);

  if (getServices().uiSettings.isDefault('defaultIndex')) {
    getServices().uiSettings.set('defaultIndex', sampleDataDefaultIndex);
  }

  clearIndexPatternsCache();
}

export async function uninstallSampleDataSet(id, sampleDataDefaultIndex) {
  await getServices().http.delete(`${sampleDataUrl}/${id}`);

  const uiSettings = getServices().uiSettings;

  if (
    !uiSettings.isDefault('defaultIndex') &&
    uiSettings.get('defaultIndex') === sampleDataDefaultIndex
  ) {
    uiSettings.set('defaultIndex', null);
  }

  clearIndexPatternsCache();
}
