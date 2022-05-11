/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpSetup } from '@kbn/core/public';
import { API_BASE_PATH } from '../../../common/constants';
import type { Settings, DevToolsSettings } from '../../services';
import { send } from '../es';
import { clearTemplates, retrieveTemplates } from './templates';
import { clearDataStreams, retrieveDataStreams } from './data_streams';
import { clearMappings, retrieveAliases, retrieveMappings } from './mappings';
import { getAutocompleteInfo, setAutocompleteInfo } from '../../services';

export interface SettingsToRetrieve {
  indices: boolean;
  fields: boolean;
  legacyTemplates: boolean;
  indexTemplates: boolean;
  componentTemplates: boolean;
  dataStreams: boolean;
}

let pollTimeoutId: ReturnType<typeof setTimeout>;

const settingKeyToPathMap = {
  fields: '_mapping',
  indices: '_aliases',
  legacyTemplates: '_template',
  indexTemplates: '_index_template',
  componentTemplates: '_component_template',
  dataStreams: '_data_stream',
};

export function retrieveSettings(
  http: HttpSetup,
  settingsKey: keyof SettingsToRetrieve,
  settingsToRetrieve: SettingsToRetrieve
) {
  // Fetch autocomplete info if setting is set to true, and if user has made changes.
  if (settingsToRetrieve[settingsKey]) {
    // Use pretty=false in these request in order to compress the response by removing whitespace
    const path = `${settingKeyToPathMap[settingsKey]}?pretty=false`;
    const method = 'GET';
    const asSystemRequest = true;
    const withProductOrigin = true;

    return send({ http, method, path, asSystemRequest, withProductOrigin });
  } else {
    if (!settingsToRetrieve[settingsKey]) {
      // If the user doesn't want autocomplete suggestions, then clear any that exist
      return Promise.resolve({});
      // return settingsPromise.resolveWith(this, [{}]);
    } else {
      // If the user doesn't want autocomplete suggestions, then clear any that exist
      return Promise.resolve();
    }
  }
}

export function retrieveAutoCompleteInfo(
  http: HttpSetup,
  settings: Settings,
  settingsToRetrieve: DevToolsSettings['autocomplete']
) {
  clearSubscriptions();

  http.get(`${API_BASE_PATH}/mappings`, { query: { ...settingsToRetrieve } }).then((data) => {
    console.log(data);
    getAutocompleteInfo().dataStreams.load(data.dataStreams);

    // Schedule next request.
    pollTimeoutId = setTimeout(() => {
      // This looks strange/inefficient, but it ensures correct behavior because we don't want to send
      // a scheduled request if the user turns off polling.
      if (settings.getPolling()) {
        retrieveAutoCompleteInfo(http, settings, settings.getAutocomplete());
      }
    }, settings.getPollInterval());
  });
}

export function clearSubscriptions() {
  if (pollTimeoutId) {
    clearTimeout(pollTimeoutId);
  }
}

export function clear() {
  clearMappings();
  clearTemplates();
  clearDataStreams();
}
