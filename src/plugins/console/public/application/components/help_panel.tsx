/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiText,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';
import { EditorExample } from './editor_example';
import { useServicesContext } from '../contexts';

interface Props {
  onClose: () => void;
}

export function HelpPanel(props: Props) {
  const { docLinks } = useServicesContext();

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
              defaultMessage="You can type one or more requests in the editor. Console understands requests in a compact format."
            />
          </p>
          <p>
            <FormattedMessage
              id="console.helpPage.learnAboutConsoleAndQueryDslText"
              defaultMessage="Learn about {console} and {queryDsl}"
              values={{
                console: (
                  <EuiLink href={docLinks.console.guide} target="_blank" external>
                    Console
                  </EuiLink>
                ),
                queryDsl: (
                  <EuiLink href={docLinks.query.queryDsl} target="_blank" external>
                    Query DSL
                  </EuiLink>
                ),
              }}
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
