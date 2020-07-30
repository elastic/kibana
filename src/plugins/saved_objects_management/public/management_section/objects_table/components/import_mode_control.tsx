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

import React, { useState, Fragment } from 'react';
import { EuiRadioGroup, EuiText, EuiSwitchEvent, EuiSwitch, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface ImportModeControlProps {
  initialValues: ImportMode;
  isLegacyFile: boolean;
  updateSelection: (result: ImportMode) => void;
}

export interface ImportMode {
  createNewCopies: boolean;
  overwrite: boolean;
}

export const ImportModeControl = ({
  initialValues,
  isLegacyFile,
  updateSelection,
}: ImportModeControlProps) => {
  const [createNewCopies, setCreateNewCopies] = useState(initialValues.createNewCopies);
  const [overwrite, setOverwrite] = useState(initialValues.overwrite);

  const disabledOption = {
    id: 'createNewCopiesDisabled',
    title: i18n.translate(
      'savedObjectsManagement.objectsTable.importModeControl.createNewCopies.disabledTitle',
      { defaultMessage: 'Check for conflicts' }
    ),
    text: i18n.translate(
      'savedObjectsManagement.objectsTable.importModeControl.createNewCopies.disabledText',
      {
        defaultMessage:
          'Check if each object was previously copied or imported into the destination space.',
      }
    ),
  };
  const enabledOption = {
    id: 'createNewCopiesEnabled',
    title: i18n.translate(
      'savedObjectsManagement.objectsTable.importModeControl.createNewCopies.enabledTitle',
      { defaultMessage: 'Add as copies' }
    ),
    text: i18n.translate(
      'savedObjectsManagement.objectsTable.importModeControl.createNewCopies.enabledText',
      { defaultMessage: 'All imported objects will be created with new random IDs.' }
    ),
  };
  const createLabel = ({ title, text }: { title: string; text: string }) => (
    <Fragment>
      <EuiText>{title}</EuiText>
      <EuiSpacer size="xs" />
      <EuiText color="subdued">{text}</EuiText>
    </Fragment>
  );

  const onChange = (partial: Partial<ImportMode>) => {
    if (partial.createNewCopies !== undefined) {
      setCreateNewCopies(partial.createNewCopies);
    } else if (partial.overwrite !== undefined) {
      setOverwrite(partial.overwrite);
    }
    updateSelection({ createNewCopies, overwrite, ...partial });
  };

  const switchLabel = i18n.translate(
    'savedObjectsManagement.objectsTable.importModeControl.overwriteSwitch',
    { defaultMessage: 'Automatically try to overwrite conflicts' }
  );
  const overwriteSwitch = (
    <EuiSwitch
      label={switchLabel}
      compressed={!isLegacyFile}
      checked={overwrite}
      disabled={!isLegacyFile && createNewCopies}
      onChange={({ target: { checked } }: EuiSwitchEvent) => onChange({ overwrite: checked })}
      data-test-subj={'importSavedObjectsImportModeOverwriteSwitch'}
    />
  );

  if (isLegacyFile) {
    return overwriteSwitch;
  }

  return (
    <EuiRadioGroup
      options={[
        {
          id: disabledOption.id,
          label: (
            <Fragment>
              {createLabel(disabledOption)}
              <EuiSpacer size="xs" />
              {overwriteSwitch}
              <EuiSpacer size="m" />
            </Fragment>
          ),
        },
        { id: enabledOption.id, label: createLabel(enabledOption) },
      ]}
      idSelected={createNewCopies ? enabledOption.id : disabledOption.id}
      onChange={(id: string) => onChange({ createNewCopies: id === enabledOption.id })}
      data-test-subj={'importSavedObjectsImportModeRadio'}
    />
  );
};
