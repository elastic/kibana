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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { BehaviorSubject, combineLatest } from 'rxjs';

// @ts-ignore
import mappings from '../../../../../public/quarantined/src/mappings';
// @ts-ignore
import init from '../../../../../public/quarantined/src/app';

import { EditorOutput, Editor, ConsoleHistory } from '../editor';
import { subscribeResizeChecker } from '../editor/legacy/subscribe_console_resize_checker';

import {
  AutocompleteOptions,
  TopNavMenu,
  WelcomePanel,
  DevToolsSettingsModal,
  HelpPanel,
  PanelsContainer,
  Panel,
} from '../../components';

import { useAppContext } from '../../context';
import { StorageKeys, DevToolsSettings } from '../../../services';

import { getTopNavConfig } from './get_top_nav';

const INITIAL_PANEL_WIDTH = 50;
const PANEL_MIN_WIDTH = '100px';

// We only run certain initialization after we know all our editors have
// been instantiated -- which is what we use the below streams for.
const inputReadySubject$ = new BehaviorSubject<any>(null);
const outputReadySubject$ = new BehaviorSubject<any>(null);
const editorsReady$ = combineLatest(inputReadySubject$, outputReadySubject$);

export function Main() {
  const {
    services: { storage, settings, history },
    docLinkVersion,
    ResizeChecker,
  } = useAppContext();

  const [editorReady, setEditorReady] = useState<boolean>(false);
  const [inputEditor, setInputEditor] = useState<any>(null);
  const [outputEditor, setOutputEditor] = useState<any>(null);
  const [showWelcome, setShowWelcomePanel] = useState(
    () => storage.get('version_welcome_shown') !== '@@SENSE_REVISION'
  );

  const [showingHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const containerRef = useRef<null | HTMLDivElement>(null);

  const onInputEditorReady = useCallback((value: any) => {
    inputReadySubject$.next(value);
  }, []);

  const onOutputEditorReady = useCallback((value: any) => {
    outputReadySubject$.next(value);
  }, []);

  const [firstPanelWidth, secondPanelWidth] = storage.get(StorageKeys.WIDTH, [
    INITIAL_PANEL_WIDTH,
    INITIAL_PANEL_WIDTH,
  ]);

  const onPanelWidthChange = useCallback(
    debounce((widths: number[]) => {
      storage.set(StorageKeys.WIDTH, widths);
    }, 300),
    []
  );

  const [pastRequests, setPastRequests] = useState<any[]>(() => history.getHistory());

  const sendCurrentRequest = useCallback(() => {
    inputEditor.focus();
    inputEditor.sendCurrentRequestToES(() => {
      setPastRequests(history.getHistory());
    }, outputEditor);
  }, [inputEditor, outputEditor]);

  const clearHistory = useCallback(() => {
    history.clearHistory();
    setPastRequests(history.getHistory());
  }, []);

  const restoreFromHistory = useCallback((req: any) => {
    history.restoreFromHistory(req);
  }, []);

  const renderConsoleHistory = () => {
    return editorReady ? (
      <ConsoleHistory
        restoreFromHistory={restoreFromHistory}
        clearHistory={clearHistory}
        requests={pastRequests}
        close={() => setShowHistory(false)}
      />
    ) : null;
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

  useEffect(() => {
    let resizerSubscriptions: Array<() => void> = [];
    const readySubscription = editorsReady$.subscribe(([input, output]) => {
      settings.registerOutput(output.editor);
      settings.registerInput(input.editor);
      history.setEditor(input.editor);

      init(input.editor, output.editor, history);

      // This may kick of a polling mechanic, needs to be refactored to more
      // standard subscription pattern.
      mappings.retrieveAutoCompleteInfo();

      resizerSubscriptions = resizerSubscriptions.concat([
        subscribeResizeChecker(ResizeChecker, containerRef.current!, input.editor, output.editor),
        subscribeResizeChecker(ResizeChecker, input.element, input.editor),
        subscribeResizeChecker(ResizeChecker, output.element, output.editor),
      ]);

      setInputEditor(input.editor);
      setOutputEditor(output.editor);
      setEditorReady(true);
    });

    return () => {
      resizerSubscriptions.map(done => done());
      readySubscription.unsubscribe();
      mappings.clearSubscriptions();
    };
  }, []);

  return (
    <div className="consoleContainer" style={{ height: '100%', width: '100%' }} ref={containerRef}>
      <EuiFlexGroup
        style={{ height: '100%' }}
        gutterSize="none"
        direction="column"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <TopNavMenu
            items={getTopNavConfig({
              onClickHistory: () => setShowHistory(!showingHistory),
              onClickSettings: () => setShowSettings(true),
              onClickHelp: () => setShowHelp(!showHelp),
            })}
          />
        </EuiFlexItem>
        {showingHistory ? <EuiFlexItem grow={false}>{renderConsoleHistory()}</EuiFlexItem> : null}
        <EuiFlexItem>
          <PanelsContainer onPanelWidthChange={onPanelWidthChange}>
            <Panel
              style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
              initialWidth={firstPanelWidth + '%'}
            >
              <Editor
                sendCurrentRequest={sendCurrentRequest}
                onEditorReady={onInputEditorReady}
                docLinkVersion={docLinkVersion}
              />
            </Panel>
            <Panel
              style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
              initialWidth={secondPanelWidth + '%'}
            >
              <EditorOutput onReady={onOutputEditorReady} />
            </Panel>
          </PanelsContainer>
        </EuiFlexItem>
      </EuiFlexGroup>

      {showWelcome ? (
        <WelcomePanel
          onDismiss={() => {
            storage.set('version_welcome_shown', '@@SENSE_REVISION');
            setShowWelcomePanel(false);
          }}
        />
      ) : null}

      {showSettings ? (
        <DevToolsSettingsModal
          onSaveSettings={onSaveSettings}
          onClose={() => setShowSettings(false)}
          refreshAutocompleteSettings={refreshAutocompleteSettings}
          settings={settings.getCurrentSettings()}
        />
      ) : null}

      {showHelp ? <HelpPanel onClose={() => setShowHelp(false)} /> : null}
    </div>
  );
}
