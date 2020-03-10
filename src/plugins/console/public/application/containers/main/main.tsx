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

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiPageContent } from '@elastic/eui';
import { ConsoleHistory } from '../console_history';
import { Editor } from '../editor';
import { Settings } from '../settings';
import { FileTree } from '../file_tree';

import { TopNavMenu, WelcomePanel, HelpPanel, SomethingWentWrongCallout } from '../../components';

import { useServicesContext, useEditorContext } from '../../contexts';
import { useDataInit } from '../../hooks';

import { getTopNavConfig } from './get_top_nav';

export function Main() {
  const {
    services: { storage },
  } = useServicesContext();

  const [{ ready: editorsReady }] = useEditorContext();

  const [showWelcome, setShowWelcomePanel] = useState(
    () => storage.get('version_welcome_shown') !== '@@SENSE_REVISION'
  );

  const [showingHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFileTree, setShowFileTree] = useState(false);

  const renderConsoleHistory = () => {
    return editorsReady ? <ConsoleHistory close={() => setShowHistory(false)} /> : null;
  };
  const { done, error, retry } = useDataInit();

  if (error) {
    return (
      <EuiPageContent>
        <SomethingWentWrongCallout onButtonClick={retry} error={error} />
      </EuiPageContent>
    );
  }

  return (
    <div id="consoleRoot">
      <EuiFlexGroup gutterSize="none" direction="column" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle className="euiScreenReaderOnly">
            <h1>
              {i18n.translate('console.pageHeading', {
                defaultMessage: 'Console',
              })}
            </h1>
          </EuiTitle>
          <TopNavMenu
            disabled={!done}
            items={getTopNavConfig({
              onClickFiles: () => setShowFileTree(!showFileTree),
              onClickHistory: () => setShowHistory(!showingHistory),
              onClickSettings: () => setShowSettings(true),
              onClickHelp: () => setShowHelp(!showHelp),
            })}
          />
        </EuiFlexItem>
        {showingHistory ? <EuiFlexItem grow={false}>{renderConsoleHistory()}</EuiFlexItem> : null}
        <EuiFlexItem>
          <EuiFlexGroup
            responsive={false}
            style={{ height: '100%' }}
            direction="row"
            gutterSize="none"
          >
            {showFileTree && (
              <EuiFlexItem grow={false}>
                <FileTree />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <Editor />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {done && showWelcome ? (
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
