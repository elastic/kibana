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

import React, { Fragment, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFlexGrid,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { DevToolsSettings } from './dev_tools_settings';

interface Props {
  onSaveSettings: (newSettings: DevToolsSettings) => Promise<void>;
  onClose: () => void;
  settings: DevToolsSettings;
}

export function DevToolsSettingsModal(props: Props) {
  const [fontSize, setFontSize] = useState(props.settings.fontSize);
  const [wrapMode, setWrapMode] = useState(props.settings.wrapMode);
  const [fields, setFields] = useState(props.settings.autocomplete.fields);
  const [indices, setIndices] = useState(props.settings.autocomplete.indices);
  const [templates, setTemplates] = useState(props.settings.autocomplete.templates);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      // TODO
    };
  }, []);

  function saveSettings() {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    props.onSaveSettings({
      fontSize,
      wrapMode,
      autocomplete: {
        fields,
        indices,
        templates,
      },
    });

    setIsLoading(false);
  }

  return (
    <EuiOverlayMask>
      <EuiModal
        data-test-subj="devToolsSettingsModal"
        className="devToolsSettingsModal"
        onClose={props.onClose}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage id="console.settingsPage.pageTitle" defaultMessage="Settings" />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody className="euiText euiText--medium euiText--constrainedWidth">
          <EuiFlexGrid columns={1}>
            <EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="console.settingsPage.fontSizeLabel"
                      defaultMessage="Font Size"
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldNumber
                  autoFocus
                  data-test-subj="fontSizeInput"
                  value={fontSize}
                  onChange={e => {
                    setFontSize((e.target.value as unknown) as number);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSwitch
                checked={wrapMode}
                data-test-subj="settingsWrapLines"
                id="wrapLines"
                label={
                  <FormattedMessage
                    defaultMessage="Wrap Long Lines"
                    id="console.settingsPage.wrapLongLinesLabelText"
                  />
                }
                onChange={e => setWrapMode(e.target.checked)}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <h4>
                <FormattedMessage
                  id="console.settingsPage.autocompleteLabel"
                  defaultMessage="Autocomplete"
                />
              </h4>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSwitch
                checked={fields}
                data-test-subj="autocompleteFields"
                id="wrapLines"
                label={
                  <FormattedMessage
                    defaultMessage="Fields"
                    id="console.settingsPage.fieldsLabelText"
                  />
                }
                onChange={e => setFields(e.target.checked)}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSwitch
                checked={indices}
                data-test-subj="autocompleteIndices"
                id="wrapLines"
                label={
                  <FormattedMessage
                    defaultMessage="Indices &amp; Aliases"
                    id="console.settingsPage.indicesAndAliasesLabelText"
                  />
                }
                onChange={e => setIndices(e.target.checked)}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSwitch
                checked={templates}
                data-test-subj="autocompleteTemplates"
                id="wrapLines"
                label={
                  <FormattedMessage
                    defaultMessage="Templatess"
                    id="console.settingsPage.templates"
                  />
                }
                onChange={e => setTemplates(e.target.checked)}
              />
            </EuiFlexItem>
          </EuiFlexGrid>

          <EuiSpacer />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty data-test-subj="settingsCancelButton" onClick={props.onClose}>
            <FormattedMessage id="console.settingsPage.cancelButtonLabel" defaultMessage="Cancel" />
          </EuiButtonEmpty>

          <EuiButton
            fill
            data-test-subj="saveSettingsButton"
            onClick={saveSettings}
            isLoading={isLoading}
          >
            <FormattedMessage id="console.settingsPage.confirmButtonLabel" defaultMessage="Save" />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
}
