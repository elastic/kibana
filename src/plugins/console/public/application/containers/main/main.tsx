/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiPageTemplate } from '@elastic/eui';
import { ConsoleHistory } from '../console_history';
import { Editor } from '../editor';
import { Settings } from '../settings';
import { Variables } from '../variables';

import {
  TopNavMenu,
  WelcomePanel,
  HelpPanel,
  SomethingWentWrongCallout,
  NetworkRequestStatusBar,
} from '../../components';

import { useServicesContext, useEditorReadContext, useRequestReadContext } from '../../contexts';
import { useDataInit } from '../../hooks';

import { getTopNavConfig } from './get_top_nav';
import type { SenseEditor } from '../../models/sense_editor';
import { getResponseWithMostSevereStatusCode } from '../../../lib/utils';

export interface MainProps {
  hideWelcome?: boolean;
}

export function Main({ hideWelcome = false }: MainProps) {
  const {
    services: { storage },
  } = useServicesContext();

  const { ready: editorsReady } = useEditorReadContext();

  const {
    requestInFlight: requestInProgress,
    lastResult: { data: requestData, error: requestError },
  } = useRequestReadContext();

  const [showWelcome, setShowWelcomePanel] = useState(
    () => storage.get('version_welcome_shown') !== '@@SENSE_REVISION' && !hideWelcome
  );

  const [showingHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showVariables, setShowVariables] = useState(false);

  const [editorInstance, setEditorInstance] = useState<SenseEditor | null>(null);

  const renderConsoleHistory = () => {
    return editorsReady ? <ConsoleHistory close={() => setShowHistory(false)} /> : null;
  };
  const { done, error, retry } = useDataInit();

  if (error) {
    return (
      <EuiPageTemplate.EmptyPrompt color="danger">
        <SomethingWentWrongCallout onButtonClick={retry} error={error} />
      </EuiPageTemplate.EmptyPrompt>
    );
  }

  const data = getResponseWithMostSevereStatusCode(requestData) ?? requestError;

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
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem>
              <TopNavMenu
                disabled={!done}
                items={getTopNavConfig({
                  onClickHistory: () => setShowHistory(!showingHistory),
                  onClickSettings: () => setShowSettings(true),
                  onClickHelp: () => setShowHelp(!showHelp),
                  onClickVariables: () => setShowVariables(!showVariables),
                })}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="conApp__tabsExtension">
              <NetworkRequestStatusBar
                requestInProgress={requestInProgress}
                requestResult={
                  data
                    ? {
                        method: data.request.method.toUpperCase(),
                        endpoint: data.request.path,
                        statusCode: data.response.statusCode,
                        statusText: data.response.statusText,
                        timeElapsedMs: data.response.timeMs,
                      }
                    : undefined
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {showingHistory ? <EuiFlexItem grow={false}>{renderConsoleHistory()}</EuiFlexItem> : null}
        <EuiFlexItem>
          <Editor loading={!done} setEditorInstance={setEditorInstance} />
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

      {showSettings ? (
        <Settings onClose={() => setShowSettings(false)} editorInstance={editorInstance} />
      ) : null}

      {showVariables ? <Variables onClose={() => setShowVariables(false)} /> : null}

      {showHelp ? <HelpPanel onClose={() => setShowHelp(false)} /> : null}
    </div>
  );
}
