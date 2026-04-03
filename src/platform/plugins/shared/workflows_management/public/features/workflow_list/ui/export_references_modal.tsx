/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowListItemDto } from '@kbn/workflows';

interface ExportReferencesModalProps {
  missingWorkflows: WorkflowListItemDto[];
  onIgnore: () => void;
  onAddDirect: () => void;
  onAddAll: () => void;
  onCancel: () => void;
}

export const ExportReferencesModal: React.FC<ExportReferencesModalProps> = ({
  missingWorkflows,
  onIgnore,
  onAddDirect,
  onAddAll,
  onCancel,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  return (
    <EuiModal
      onClose={onCancel}
      data-test-subj="export-references-modal"
      aria-labelledby={modalTitleId}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('workflows.exportReferences.title', {
            defaultMessage: 'Referenced workflows not included',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          <p>
            {i18n.translate('workflows.exportReferences.description', {
              defaultMessage:
                'The selected workflows reference {count} other {count, plural, one {workflow} other {workflows}} not included in the export:',
              values: { count: missingWorkflows.length },
            })}
          </p>
        </EuiText>
        <EuiListGroup flush maxWidth={false} gutterSize="none">
          {missingWorkflows.map((w) => (
            <EuiListGroupItem
              key={w.id}
              label={w.name}
              size="s"
              data-test-subj={`export-references-workflow-${w.id}`}
            />
          ))}
        </EuiListGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} data-test-subj="export-references-cancel">
              {i18n.translate('workflows.exportReferences.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onIgnore} data-test-subj="export-references-ignore">
              {i18n.translate('workflows.exportReferences.ignore', {
                defaultMessage: 'Ignore',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onAddDirect} data-test-subj="export-references-add-direct">
              {i18n.translate('workflows.exportReferences.addDirect', {
                defaultMessage: 'Add referenced',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onAddAll} fill data-test-subj="export-references-add-all">
              {i18n.translate('workflows.exportReferences.addAll', {
                defaultMessage: 'Add all referenced',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
