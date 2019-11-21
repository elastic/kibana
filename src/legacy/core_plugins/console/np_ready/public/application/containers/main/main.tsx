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
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';

import { EditorOutput, Editor, ConsoleHistory } from '../editor';
import { Settings } from '../settings';

// TODO: find out what this is: $(document.body).removeClass('fouc');

import { TopNavMenu, WelcomePanel, HelpPanel, PanelsContainer, Panel } from '../../components';

import { useAppContext } from '../../context';
import { StorageKeys } from '../../../services';

import { getTopNavConfig } from './get_top_nav';
import { useEditorReadContext } from '../editor';

const INITIAL_PANEL_WIDTH = 50;
const PANEL_MIN_WIDTH = '100px';

export function Main() {
  const {
    services: { storage },
  } = useAppContext();

  const { editorsReady } = useEditorReadContext();

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
    debounce((widths: number[]) => {
      storage.set(StorageKeys.WIDTH, widths);
    }, 300),
    []
  );

  const renderConsoleHistory = () => {
    return editorsReady ? <ConsoleHistory close={() => setShowHistory(false)} /> : null;
  };

  return (
    <div id="consoleRoot">
      <EuiFlexGroup
        className="consoleContainer"
        gutterSize="none"
        direction="column"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle className="euiScreenReaderOnly">
            <h1>
              {i18n.translate('console.pageHeading', {
                defaultMessage: 'Console',
              })}
            </h1>
          </EuiTitle>
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
              <Editor />
            </Panel>
            <Panel
              style={{ height: '100%', position: 'relative', minWidth: PANEL_MIN_WIDTH }}
              initialWidth={secondPanelWidth + '%'}
            >
              <EditorOutput />
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

      {showSettings ? <Settings onClose={() => setShowSettings(false)} /> : null}

      {showHelp ? <HelpPanel onClose={() => setShowHelp(false)} /> : null}
    </div>
  );
}
