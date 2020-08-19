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
import {
  EuiFormFieldset,
  EuiTitle,
  EuiCheckableCard,
  EuiRadioGroup,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
} from '@elastic/eui';
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

const createNewCopiesDisabled = {
  id: 'createNewCopiesDisabled',
  text: i18n.translate(
    'savedObjectsManagement.objectsTable.importModeControl.createNewCopies.disabledTitle',
    { defaultMessage: 'Check for existing objects' }
  ),
  tooltip: i18n.translate(
    'savedObjectsManagement.objectsTable.importModeControl.createNewCopies.disabledText',
    {
      defaultMessage:
        'Check if each object was previously copied or imported into the destination space.',
    }
  ),
};
const createNewCopiesEnabled = {
  id: 'createNewCopiesEnabled',
  text: i18n.translate(
    'savedObjectsManagement.objectsTable.importModeControl.createNewCopies.enabledTitle',
    { defaultMessage: 'Create new objects with random IDs' }
  ),
  tooltip: i18n.translate(
    'savedObjectsManagement.objectsTable.importModeControl.createNewCopies.enabledText',
    { defaultMessage: 'All imported objects will be created with new random IDs.' }
  ),
};
const overwriteEnabled = {
  id: 'overwriteEnabled',
  label: i18n.translate(
    'savedObjectsManagement.objectsTable.importModeControl.overwrite.enabledLabel',
    { defaultMessage: 'Automatically try to overwrite conflicts' }
  ),
};
const overwriteDisabled = {
  id: 'overwriteDisabled',
  label: i18n.translate(
    'savedObjectsManagement.objectsTable.importModeControl.overwrite.disabledLabel',
    { defaultMessage: 'Request action when conflict occurs' }
  ),
};
const importOptionsTitle = i18n.translate(
  'savedObjectsManagement.objectsTable.importModeControl.importOptionsTitle',
  { defaultMessage: 'Import options' }
);

const createLabel = ({ text, tooltip }: { text: string; tooltip: string }) => (
  <EuiFlexGroup>
    <EuiFlexItem>
      <EuiText>{text}</EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIconTip content={tooltip} position="left" type="iInCircle" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const ImportModeControl = ({
  initialValues,
  isLegacyFile,
  updateSelection,
}: ImportModeControlProps) => {
  const [createNewCopies, setCreateNewCopies] = useState(initialValues.createNewCopies);
  const [overwrite, setOverwrite] = useState(initialValues.overwrite);

  const onChange = (partial: Partial<ImportMode>) => {
    if (partial.createNewCopies !== undefined) {
      setCreateNewCopies(partial.createNewCopies);
    } else if (partial.overwrite !== undefined) {
      setOverwrite(partial.overwrite);
    }
    updateSelection({ createNewCopies, overwrite, ...partial });
  };

  const overwriteRadio = (
    <EuiRadioGroup
      options={[overwriteEnabled, overwriteDisabled]}
      idSelected={overwrite ? overwriteEnabled.id : overwriteDisabled.id}
      onChange={(id: string) => onChange({ overwrite: id === overwriteEnabled.id })}
      disabled={createNewCopies}
      data-test-subj={'savedObjectsManagement-importModeControl-overwriteRadioGroup'}
    />
  );

  if (isLegacyFile) {
    return overwriteRadio;
  }

  return (
    <EuiFormFieldset
      legend={{
        children: (
          <EuiTitle size="xs">
            <span>{importOptionsTitle}</span>
          </EuiTitle>
        ),
      }}
    >
      <EuiCheckableCard
        id={createNewCopiesDisabled.id}
        label={createLabel(createNewCopiesDisabled)}
        checked={!createNewCopies}
        onChange={() => onChange({ createNewCopies: false })}
      >
        {overwriteRadio}
      </EuiCheckableCard>

      <EuiSpacer size="s" />

      <EuiCheckableCard
        id={createNewCopiesEnabled.id}
        label={createLabel(createNewCopiesEnabled)}
        checked={createNewCopies}
        onChange={() => onChange({ createNewCopies: true })}
      />
    </EuiFormFieldset>
  );
};
