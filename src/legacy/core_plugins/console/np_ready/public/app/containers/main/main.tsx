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

import React, { useCallback, useState } from 'react';
import { debounce } from 'lodash';

import {
  AutocompleteOptions,
  TopNavMenu,
  WelcomePanel,
  DevToolsSettingsModal,
  HelpPanel,
} from '../../components';

import { MemoConsoleEditor, ConsoleHistory } from '../editor';
import { useAppContext } from '../../context';
import { StorageKeys, DevToolsSettings } from '../../services';

// @ts-ignore
import mappings from '../../../../../public/quarantined/src/mappings';

import { getTopNavConfig } from './get_top_nav';

const INITIAL_PANEL_WIDTH = 50;

export function Main() {
  const {
    services: { storage, settings },
    docLinkVersion,
  } = useAppContext();

  const [editorReady, setEditorReady] = useState<boolean>(false);
  const [showWelcome, setShowWelcomePanel] = useState(
    () => storage.get('version_welcome_shown') !== '@@SENSE_REVISION'
  );

  const [showingHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [firstPanelWidth, secondPanelWidth] = storage.get(StorageKeys.WIDTH, [
    INITIAL_PANEL_WIDTH,
    INITIAL_PANEL_WIDTH,
  ]);

  const onPanelWidthChange = useCallback(
    debounce(
      (widths: number[]) => {
        storage.set(StorageKeys.WIDTH, widths);
      },
      300,
      { trailing: true }
    ),
    []
  );

  const onEditorReady = useCallback(() => setEditorReady(true), []);

  const renderConsoleHistory = () => {
    return editorReady ? <ConsoleHistory close={() => setShowHistory(false)} /> : null;
  };

  const refreshAutocompleteSettings = (selectedSettings: any) => {
    mappings.retrieveAutoCompleteInfo(selectedSettings);
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
        const changedSettings: any = autocompleteDiff.reduce(
          (changedSettingsAccum: any, setting: string): any => {
            changedSettingsAccum[setting] =
              newSettings.autocomplete[setting as AutocompleteOptions];
            return changedSettingsAccum;
          },
          {}
        );
        mappings.retrieveAutoCompleteInfo(changedSettings.autocomplete);
      } else if (isPollingChanged) {
        // If the user has turned polling on, then we'll fetch all selected autocomplete settings.
        mappings.retrieveAutoCompleteInfo();
      }
    }
  };

  const onSaveSettings = async (newSettings: DevToolsSettings) => {
    const prevSettings = settings.getCurrentSettings();
    settings.updateSettings(newSettings);
    fetchAutocompleteSettingsIfNeeded(newSettings, prevSettings);
    setShowSettings(false);
  };

  return (
    <>
      <TopNavMenu
        items={getTopNavConfig({
          onClickHistory: () => setShowHistory(!showingHistory),
          onClickSettings: () => setShowSettings(true),
          onClickHelp: () => setShowHelp(!showHelp),
        })}
      />
      {showingHistory ? renderConsoleHistory() : null}
      <MemoConsoleEditor
        onEditorsReady={onEditorReady}
        docLinkVersion={docLinkVersion}
        onPanelWidthChange={onPanelWidthChange}
        initialInputPanelWidth={firstPanelWidth}
        initialOutputPanelWidth={secondPanelWidth}
      />

      {showWelcome ? <WelcomePanel onDismiss={() => setShowWelcomePanel(false)} /> : null}

      {showSettings ? (
        <DevToolsSettingsModal
          onSaveSettings={onSaveSettings}
          onClose={() => setShowSettings(false)}
          refreshAutocompleteSettings={refreshAutocompleteSettings}
          settings={settings.getCurrentSettings()}
        />
      ) : null}

      {showHelp ? <HelpPanel onClose={() => setShowHelp(false)} /> : null}
    </>
  );
}
