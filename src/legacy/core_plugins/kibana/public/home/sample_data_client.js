/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { kfetch } from 'ui/kfetch';
import chrome from 'ui/chrome';
import { indexPatternService } from './kibana_services';

const sampleDataUrl = '/api/sample_data';

function clearIndexPatternsCache() {
  indexPatternService.clearCache();
}

export async function listSampleDataSets() {
  return await kfetch({ method: 'GET', pathname: sampleDataUrl });
}

export async function installSampleDataSet(id, sampleDataDefaultIndex) {
  await kfetch({ method: 'POST', pathname: `${sampleDataUrl}/${id}` });

  if (chrome.getUiSettingsClient().isDefault('defaultIndex')) {
    chrome.getUiSettingsClient().set('defaultIndex', sampleDataDefaultIndex);
  }

  clearIndexPatternsCache();
}

export async function uninstallSampleDataSet(id, sampleDataDefaultIndex) {
  await kfetch({ method: 'DELETE', pathname: `${sampleDataUrl}/${id}` });

  if (
    !chrome.getUiSettingsClient().isDefault('defaultIndex') &&
    chrome.getUiSettingsClient().get('defaultIndex') === sampleDataDefaultIndex
  ) {
    chrome.getUiSettingsClient().set('defaultIndex', null);
  }

  clearIndexPatternsCache();
}
