/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import type { HttpSetup } from 'kibana/public';
import { AutocompleteOptions, DevToolsSettingsModal } from '../components';

// @ts-ignore
import { retrieveAutoCompleteInfo } from '../../lib/mappings/mappings';
import { useServicesContext, useEditorActionContext } from '../contexts';
import { DevToolsSettings, Settings as SettingsService } from '../../services';
import type { SenseEditor } from '../models';

const getAutocompleteDiff = (
  newSettings: DevToolsSettings,
  prevSettings: DevToolsSettings
): AutocompleteOptions[] => {
  return Object.keys(newSettings.autocomplete).filter((key) => {
    // @ts-ignore
    return prevSettings.autocomplete[key] !== newSettings.autocomplete[key];
  }) as AutocompleteOptions[];
};

const refreshAutocompleteSettings = (
  http: HttpSetup,
  settings: SettingsService,
  selectedSettings: DevToolsSettings['autocomplete']
) => {
  retrieveAutoCompleteInfo(http, settings, selectedSettings);
};

const fetchAutocompleteSettingsIfNeeded = (
  http: HttpSetup,
  settings: SettingsService,
  newSettings: DevToolsSettings,
  prevSettings: DevToolsSettings
) => {
  // We'll only retrieve settings if polling is on. The expectation here is that if the user
  // disables polling it's because they want manual control over the fetch request (possibly
  // because it's a very expensive request given their cluster and bandwidth). In that case,
  // they would be unhappy with any request that's sent automatically.
  if (newSettings.polling) {
    const autocompleteDiff = getAutocompleteDiff(newSettings, prevSettings);

    const isSettingsChanged = autocompleteDiff.length > 0;
    const isPollingChanged = prevSettings.polling !== newSettings.polling;

    if (isSettingsChanged) {
      // If the user has changed one of the autocomplete settings, then we'll fetch just the
      // ones which have changed.
      const changedSettings: DevToolsSettings['autocomplete'] = autocompleteDiff.reduce(
        (changedSettingsAccum, setting) => {
          changedSettingsAccum[setting] = newSettings.autocomplete[setting];
          return changedSettingsAccum;
        },
        {} as DevToolsSettings['autocomplete']
      );
      retrieveAutoCompleteInfo(http, settings, changedSettings);
    } else if (isPollingChanged && newSettings.polling) {
      // If the user has turned polling on, then we'll fetch all selected autocomplete settings.
      retrieveAutoCompleteInfo(http, settings, settings.getAutocomplete());
    }
  }
};

export interface Props {
  onClose: () => void;
  editorInstance: SenseEditor | null;
}

export function Settings({ onClose }: Props) {
  const {
    services: { settings, http },
  } = useServicesContext();

  const dispatch = useEditorActionContext();

  const onSaveSettings = (newSettings: DevToolsSettings) => {
    const prevSettings = settings.toJSON();
    fetchAutocompleteSettingsIfNeeded(http, settings, newSettings, prevSettings);

    // Update the new settings in localStorage
    settings.updateSettings(newSettings);

    // Let the rest of the application know settings have updated.
    dispatch({
      type: 'updateSettings',
      payload: newSettings,
    });
    onClose();
  };

  return (
    <DevToolsSettingsModal
      onClose={onClose}
      onSaveSettings={onSaveSettings}
      refreshAutocompleteSettings={(selectedSettings) =>
        refreshAutocompleteSettings(http, settings, selectedSettings)
      }
      settings={settings.toJSON()}
    />
  );
}
