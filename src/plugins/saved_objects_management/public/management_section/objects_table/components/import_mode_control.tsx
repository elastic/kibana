/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
      defaultMessage: 'Check if objects were previously copied or imported.',
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
    {
      defaultMessage: 'Use this option to create one or more copies of the object.',
    }
  ),
};
const overwriteEnabled = {
  id: 'overwriteEnabled',
  label: i18n.translate(
    'savedObjectsManagement.objectsTable.importModeControl.overwrite.enabledLabel',
    { defaultMessage: 'Automatically overwrite conflicts' }
  ),
};
const overwriteDisabled = {
  id: 'overwriteDisabled',
  label: i18n.translate(
    'savedObjectsManagement.objectsTable.importModeControl.overwrite.disabledLabel',
    { defaultMessage: 'Request action on conflict' }
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

export const ImportModeControl = ({ initialValues, updateSelection }: ImportModeControlProps) => {
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
        <EuiRadioGroup
          options={[overwriteEnabled, overwriteDisabled]}
          idSelected={overwrite ? overwriteEnabled.id : overwriteDisabled.id}
          onChange={(id: string) => onChange({ overwrite: id === overwriteEnabled.id })}
          disabled={createNewCopies}
          data-test-subj={'savedObjectsManagement-importModeControl-overwriteRadioGroup'}
        />
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
