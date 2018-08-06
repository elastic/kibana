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

import chrome from 'ui/chrome';
import { toastNotifications } from 'ui/notify';

const sampleDataUrl = chrome.addBasePath('/api/sample_data');
const headers = new Headers({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'kbn-xsrf': 'kibana',
});

export async function listSampleDataSets() {
  try {
    const response = await fetch(sampleDataUrl, {
      method: 'get',
      credentials: 'include',
      headers: headers,
    });

    if (response.status >= 300) {
      throw new Error(`Request failed with status code: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    toastNotifications.addDanger({
      title: `Unable to load sample data sets list`,
      text: `${err.message}`,
    });
    return [];
  }
}

export async function installSampleDataSet(id, name, defaultIndex, getConfig, setConfig, clearIndexPatternsCache) {
  try {
    const response = await fetch(`${sampleDataUrl}/${id}`, {
      method: 'post',
      credentials: 'include',
      headers: headers,
    });

    if (response.status >= 300) {
      const body = await response.text();
      throw new Error(`Request failed with status code: ${response.status}, message: ${body}`);
    }
  } catch (err) {
    toastNotifications.addDanger({
      title: `Unable to install sample data set: ${name}`,
      text: `${err.message}`,
    });
    return;
  }

  const existingDefaultIndex = await getConfig('defaultIndex');
  if (existingDefaultIndex === null) {
    await setConfig('defaultIndex', defaultIndex);
  }

  clearIndexPatternsCache();

  toastNotifications.addSuccess({
    title: `${name} installed`,
    ['data-test-subj']: 'sampleDataSetInstallToast'
  });
}

export async function uninstallSampleDataSet(id, name, defaultIndex, getConfig, setConfig, clearIndexPatternsCache) {
  try {
    const response = await fetch(`${sampleDataUrl}/${id}`, {
      method: 'delete',
      credentials: 'include',
      headers: headers,
    });
    if (response.status >= 300) {
      const body = await response.text();
      throw new Error(`Request failed with status code: ${response.status}, message: ${body}`);
    }
  } catch (err) {
    toastNotifications.addDanger({
      title: `Unable to uninstall sample data set`,
      text: `${err.message}`,
    });
    return;
  }

  const existingDefaultIndex = await getConfig('defaultIndex');
  if (existingDefaultIndex && existingDefaultIndex === defaultIndex) {
    await setConfig('defaultIndex', null);
  }

  clearIndexPatternsCache();

  toastNotifications.addSuccess({
    title: `${name} uninstalled`,
    ['data-test-subj']: 'sampleDataSetUninstallToast'
  });
}
