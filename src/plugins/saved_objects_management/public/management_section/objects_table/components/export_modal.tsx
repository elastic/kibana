/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiFormRow,
  EuiCheckboxGroup,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ExportModalProps {
  onExport: () => void;
  onCancel: () => void;
  onSelectedOptionsChange: (newSelectedOptions: Record<string, boolean>) => void;
  filteredItemCount: number;
  options: Array<{ id: string; label: string }>;
  selectedOptions: Record<string, boolean>;
  includeReferences: boolean;
  onIncludeReferenceChange: (newIncludeReference: boolean) => void;
}

export const ExportModal: FC<ExportModalProps> = ({
  onCancel,
  onExport,
  onSelectedOptionsChange,
  options,
  filteredItemCount,
  selectedOptions,
  includeReferences,
  onIncludeReferenceChange,
}) => {
  return (
    <EuiModal onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="savedObjectsManagement.objectsTable.exportObjectsConfirmModalTitle"
            defaultMessage="Export {filteredItemCount, plural, one{# object} other {# objects}}"
            values={{
              filteredItemCount,
            }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          label={
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.exportObjectsConfirmModalDescription"
              defaultMessage="Select which types to export"
            />
          }
          labelType="legend"
        >
          <EuiCheckboxGroup
            options={options}
            idToSelectedMap={selectedOptions}
            onChange={(optionId) => {
              onSelectedOptionsChange({
                ...selectedOptions,
                ...{
                  [optionId]: !selectedOptions[optionId],
                },
              });
            }}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiSwitch
          name="includeReferencesDeep"
          label={
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.exportObjectsConfirmModal.includeReferencesDeepLabel"
              defaultMessage="Include related objects"
            />
          }
          checked={includeReferences}
          onChange={() => onIncludeReferenceChange(!includeReferences)}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onCancel} data-test-subj="cancelAllExports">
                  <FormattedMessage
                    id="savedObjectsManagement.objectsTable.exportObjectsConfirmModal.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={onExport}>
                  <FormattedMessage
                    id="savedObjectsManagement.objectsTable.exportObjectsConfirmModal.exportAllButtonLabel"
                    defaultMessage="Export all"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
