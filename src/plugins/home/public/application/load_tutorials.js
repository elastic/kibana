/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { getServices } from './kibana_services';
import { i18n } from '@kbn/i18n';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';

const baseUrl = getServices().addBasePath('/api/kibana/home/tutorials');
const headers = new Headers();
headers.append('Accept', 'application/json');
headers.append('Content-Type', 'application/json');
headers.append('kbn-xsrf', 'kibana');
headers.append(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');

let tutorials = [];
let tutorialsLoaded = false;

async function loadTutorials() {
  try {
    const response = await fetch(baseUrl, {
      method: 'get',
      credentials: 'include',
      headers: headers,
    });
    if (response.status >= 300) {
      throw new Error(
        i18n.translate('home.loadTutorials.requestFailedErrorMessage', {
          defaultMessage: 'Request failed with status code: {status}',
          values: { status: response.status },
        })
      );
    }

    tutorials = await response.json();
    tutorialsLoaded = true;
  } catch (err) {
    getServices().toastNotifications.addDanger({
      title: i18n.translate('home.loadTutorials.unableToLoadErrorMessage', {
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

  const tutorial = tutorials.find((tutorial) => {
    return tutorial.id === id;
  });

  if (tutorial) {
    return _.cloneDeep(tutorial);
  }
}
