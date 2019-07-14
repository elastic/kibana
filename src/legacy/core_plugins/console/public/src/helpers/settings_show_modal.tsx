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

import { I18nContext } from 'ui/i18n';
import React from 'react';
import ReactDOM from 'react-dom';
import { DevToolsSettingsModal } from '../components/settings_modal';
import { DevToolsSettings } from '../components/dev_tools_settings';

// @ts-ignore
import mappings from '../mappings';
// @ts-ignore
import { getCurrentSettings, updateSettings } from '../settings';

export function showSettingsModal() {
  const container = document.getElementById('consoleSettingsModal');
  const curSettings = getCurrentSettings();

  const refreshAutocompleteSettings = selectedSettings => {
    mappings.retrieveAutoCompleteInfo(selectedSettings);
  };

  const closeModal = () => {
    if (!container) return;
    ReactDOM.unmountComponentAtNode(container);
    container.innerHTML = '';
  };

  const getAutocompleteDiff = (newSettings: DevToolsSettings, prevSettings: DevToolsSettings) => {
    return Object.keys(newSettings.autocomplete).filter(key => {
      // @ts-ignore
      return prevSettings.autocomplete[key] !== newSettings.autocomplete[key];
    });
  };

  const fetchAutocompleteSettingsIfNeeded = (
    newSettings: DevToolsSettings,
    prevSettings: DevToolsSettings
  ) => {
    // We'll only retrieve settings if polling is on.
    if (newSettings.polling) {
      const autocompleteDiff = getAutocompleteDiff(newSettings, prevSettings);

      const isSettingsChanged = autocompleteDiff.length > 0;
      const isPollingChanged = prevSettings.polling !== newSettings.polling;

      if (isSettingsChanged) {
        // If the user has changed one of the autocomplete settings, then we'll fetch just the
        // ones which have changed.
        const changedSettings = autocompleteDiff.reduce((changedSettingsAccum, setting) => {
          changedSettingsAccum[setting] = newSettings.autocomplete[setting];
          return changedSettingsAccum;
        }, {});
        mappings.retrieveAutoCompleteInfo(changedSettings);
      } else if (isPollingChanged && newSettings.polling) {
        // If the user has turned polling on, then we'll fetch all selected autocomplete settings.
        mappings.retrieveAutoCompleteInfo();
      }
    }
  };

  const onSave = async (newSettings: DevToolsSettings) => {
    const prevSettings = getCurrentSettings();
    updateSettings(newSettings);
    fetchAutocompleteSettingsIfNeeded(newSettings, prevSettings);
    closeModal();
  };

  const element = (
    <I18nContext>
      <DevToolsSettingsModal
        settings={curSettings}
        onSaveSettings={onSave}
        onClose={closeModal}
        refreshAutocompleteSettings={refreshAutocompleteSettings}
      />
    </I18nContext>
  );
  ReactDOM.render(element, container);
}
