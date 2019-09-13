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

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiText,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { EditorExample } from './editor_example';

interface Props {
  onClose: () => void;
}

export function HelpPanel(props: Props) {
  return (
    <EuiFlyout onClose={props.onClose} data-test-subj="helpFlyout" size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage id="console.helpPage.pageTitle" defaultMessage="Help" />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <h3>
            <FormattedMessage
              defaultMessage="Request format"
              id="console.helpPage.requestFormatTitle"
            />
          </h3>
          <p>
            <FormattedMessage
              id="console.helpPage.requestFormatDescription"
              defaultMessage="You can type one or more requests in the white editor. Console understands requests in a compact format:"
            />
          </p>
          <EditorExample panel="help" />
          <h3>
            <FormattedMessage
              id="console.helpPage.keyboardCommandsTitle"
              defaultMessage="Keyboard commands"
            />
          </h3>
          <EuiSpacer />
          <dl>
            <dt>Ctrl/Cmd + I</dt>
            <dd>
              <FormattedMessage
                id="console.helpPage.keyboardCommands.autoIndentDescription"
                defaultMessage="Auto indent current request"
              />
            </dd>
            <dt>Ctrl/Cmd + /</dt>
            <dd>
              <FormattedMessage
                id="console.helpPage.keyboardCommands.openDocumentationDescription"
                defaultMessage="Open documentation for current request"
              />
            </dd>
            <dt>Ctrl + Space</dt>
            <dd>
              <FormattedMessage
                id="console.helpPage.keyboardCommands.openAutoCompleteDescription"
                defaultMessage="Open Auto complete (even if not typing)"
              />
            </dd>
            <dt>Ctrl/Cmd + Enter</dt>
            <dd>
              <FormattedMessage
                id="console.helpPage.keyboardCommands.submitRequestDescription"
                defaultMessage="Submit request"
              />
            </dd>
            <dt>Ctrl/Cmd + Up/Down</dt>
            <dd>
              <FormattedMessage
                id="console.helpPage.keyboardCommands.jumpToPreviousNextRequestDescription"
                defaultMessage="Jump to the previous/next request start or end."
              />
            </dd>
            <dt>Ctrl/Cmd + Alt + L</dt>
            <dd>
              <FormattedMessage
                id="console.helpPage.keyboardCommands.collapseExpandCurrentScopeDescription"
                defaultMessage="Collapse/expand current scope."
              />
            </dd>
            <dt>Ctrl/Cmd + Option + 0</dt>
            <dd>
              <FormattedMessage
                id="console.helpPage.keyboardCommands.collapseAllScopesDescription"
                defaultMessage="Collapse all scopes but the current one. Expand by adding a shift."
              />
            </dd>
            <dt>Down arrow</dt>
            <dd>
              <FormattedMessage
                id="console.helpPage.keyboardCommands.switchFocusToAutoCompleteMenuDescription"
                defaultMessage="Switch focus to auto-complete menu. Use arrows to further select a term"
              />
            </dd>
            <dt>Enter/Tab</dt>
            <dd>
              <FormattedMessage
                id="console.helpPage.keyboardCommands.selectCurrentlySelectedInAutoCompleteMenuDescription"
                defaultMessage="Select the currently selected or the top most term in auto-complete menu"
              />
            </dd>
            <dt>Esc</dt>
            <dd>
              <FormattedMessage
                id="console.helpPage.keyboardCommands.closeAutoCompleteMenuDescription"
                defaultMessage="Close auto-complete menu"
              />
            </dd>
          </dl>
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
