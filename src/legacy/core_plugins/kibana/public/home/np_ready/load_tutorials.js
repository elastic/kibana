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

import _ from 'lodash';
import { getServices } from '../kibana_services';
import { i18n } from '@kbn/i18n';

const baseUrlLP = getServices().addBasePath('/api/kibana/home/tutorials_LP');
const baseUrl = getServices().addBasePath('/api/kibana/home/tutorials');
const headers = new Headers();
headers.append('Accept', 'application/json');
headers.append('Content-Type', 'application/json');
headers.append('kbn-xsrf', 'kibana');

let tutorials = [];
let tutorialsLegacyPlatform = [];
let tutorialsNewPlatform = [];
let tutorialsLoaded = false;

async function loadTutorials() {
  try {
    const responseLegacyPlatform = await fetch(baseUrlLP, {
      method: 'get',
      credentials: 'include',
      headers: headers,
    });
    if (responseLegacyPlatform.status >= 300) {
      throw new Error(
        i18n.translate('kbn.home.loadTutorials.requestFailedErrorMessage', {
          defaultMessage: 'Request failed with status code: {status}',
          values: { status: responseLegacyPlatform.status },
        })
      );
    }
    const responseNewPlatform = await fetch(baseUrl, {
      method: 'get',
      credentials: 'include',
      headers: headers,
    });
    if (responseNewPlatform.status >= 300) {
      throw new Error(
        i18n.translate('kbn.home.loadTutorials.requestFailedErrorMessage', {
          defaultMessage: 'Request failed with status code: {status}',
          values: { status: responseNewPlatform.status },
        })
      );
    }

    tutorialsLegacyPlatform = await responseLegacyPlatform.json();
    tutorialsNewPlatform = await responseNewPlatform.json();
    tutorials = tutorialsLegacyPlatform.concat(tutorialsNewPlatform);
    tutorialsLoaded = true;
  } catch (err) {
    getServices().toastNotifications.addDanger({
      title: i18n.translate('kbn.home.loadTutorials.unableToLoadErrorMessage', {
        defaultMessage: 'Unable to load tutorials',
      }),
      text: err.message,
    });
  }
}

export async function getTutorials() {
  if (!tutorialsLoaded) {
    await loadTutorials();
  }

  return _.cloneDeep(tutorials);
}

export async function getTutorial(id) {
  if (!tutorialsLoaded) {
    await loadTutorials();
  }

  const tutorial = tutorials.find(tutorial => {
    return tutorial.id === id;
  });

  if (tutorial) {
    return _.cloneDeep(tutorial);
  }
}
